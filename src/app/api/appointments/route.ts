import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  APPOINTMENT_STATUS,
  SLOT_STATUS,
  PAYMENT_STATUS,
  LEDGER_TYPE,
  PAYMENT_METHOD,
  PATIENT_TYPE,
  TOKEN_PURPOSE,
} from "@/lib/enums";
import { generateSecureToken, hashToken, hashIpAddress } from "@/lib/crypto";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { cache } from "@/lib/cache";
import { TOKEN_EXPIRY_DAYS_AFTER_APPOINTMENT } from "@/lib/constants";
import { Prisma } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

interface PublicBookingBody {
  slotId: string;
  lockKey: string;
  patientName: string;
  patientDob: string;
  patientPhone: string;
  patientEmail: string;
  patientType: string;
  reasonForVisit: string;
  specialtyId: string;
  serviceId: string;
  guardianName?: string;
  guardianRelation?: string;
  paymentMethod: string;
  depositCents: number;
  selfPayCents: number;
  isDemoInsurance: boolean;
}

// =============================================================================
// POST — Public appointment booking (two-phase lock: CONFIRM step)
// =============================================================================
// The slot should already be LOCKED from a prior POST /api/slots/[slotId]/lock.
// This endpoint verifies the lock, creates the appointment, and releases the lock.
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // ---- 1. Parse request body ----
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const data = body as unknown as PublicBookingBody;

    // ---- 2. Validate required fields ----
    const requiredFields: (keyof PublicBookingBody)[] = [
      "slotId",
      "lockKey",
      "patientName",
      "patientDob",
      "patientPhone",
      "patientEmail",
      "patientType",
      "reasonForVisit",
      "specialtyId",
      "serviceId",
      "paymentMethod",
    ];

    for (const field of requiredFields) {
      const val = data[field];
      if (!val || (typeof val === "string" && val.trim() === "")) {
        return NextResponse.json(
          { error: `Missing required field: ${field}`, code: `MISSING_${field.toUpperCase()}` },
          { status: 400 }
        );
      }
    }

    // ---- 3. Validate enums ----
    if (data.patientType !== PATIENT_TYPE.ADULT && data.patientType !== PATIENT_TYPE.PEDIATRIC) {
      return NextResponse.json(
        { error: "patientType must be ADULT or PEDIATRIC", code: "INVALID_PATIENT_TYPE" },
        { status: 400 }
      );
    }

    if (
      data.paymentMethod !== PAYMENT_METHOD.STRIPE &&
      data.paymentMethod !== PAYMENT_METHOD.CASH_AT_DESK &&
      data.paymentMethod !== PAYMENT_METHOD.MANUAL_WAIVER
    ) {
      return NextResponse.json(
        { error: "Invalid paymentMethod", code: "INVALID_PAYMENT_METHOD" },
        { status: 400 }
      );
    }

    // Pediatric requires guardian info
    if (data.patientType === PATIENT_TYPE.PEDIATRIC) {
      if (!data.guardianName?.trim() || !data.guardianRelation?.trim()) {
        return NextResponse.json(
          { error: "Pediatric appointments require guardianName and guardianRelation", code: "MISSING_GUARDIAN" },
          { status: 400 }
        );
      }
    }

    // Validate DOB
    const dob = new Date(data.patientDob);
    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: "patientDob must be a valid date string", code: "INVALID_DOB" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.patientEmail)) {
      return NextResponse.json(
        { error: "Invalid email format", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    // ---- 4. Atomic booking transaction ----
    const appointment = await db.$transaction(async (tx) => {
      // a. Fetch the slot lock — verify it exists and the lockKey matches
      const lock = await tx.slotLock.findUnique({
        where: { slotId: data.slotId },
      });

      if (!lock) {
        throw new PublicBookingError("NO_LOCK", "No active lock found for this slot. The lock may have expired — please try again.", 410);
      }

      if (lock.lockKey !== data.lockKey) {
        throw new PublicBookingError("LOCK_MISMATCH", "Lock key does not match. You may have a stale session.", 403);
      }

      // Check lock hasn't expired
      if (new Date() > lock.expiresAt) {
        // Clean up expired lock
        await tx.slotLock.delete({ where: { slotId: data.slotId } });
        await tx.slot.update({ where: { id: data.slotId }, data: { status: SLOT_STATUS.AVAILABLE } });
        throw new PublicBookingError("LOCK_EXPIRED", "Your booking session has expired. Please select the slot again.", 410);
      }

      // b. Fetch the slot and verify it's LOCKED
      const slot = await tx.slot.findUnique({
        where: { id: data.slotId },
        include: {
          provider: true,
          clinic: true,
        },
      });

      if (!slot) {
        throw new PublicBookingError("SLOT_NOT_FOUND", "Slot not found", 404);
      }

      if (slot.status !== SLOT_STATUS.LOCKED) {
        throw new PublicBookingError("SLOT_NOT_LOCKED", `Slot is not locked (status: ${slot.status})`, 409);
      }

      // c. Verify the service belongs to this provider
      const providerService = await tx.providerService.findUnique({
        where: {
          providerId_serviceId: {
            providerId: slot.providerId,
            serviceId: data.serviceId,
          },
        },
        include: {
          service: {
            include: { specialty: true },
          },
        },
      });

      if (!providerService) {
        throw new PublicBookingError("INVALID_SERVICE", "This service is not offered by the selected provider", 400);
      }

      // Verify specialty matches
      const specialtyId = providerService.service.specialtyId;
      if (specialtyId !== data.specialtyId) {
        throw new PublicBookingError("INVALID_SPECIALTY", "Specialty mismatch with the selected service", 400);
      }

      // d. Determine payment status
      const paymentStatus: string = data.paymentMethod === PAYMENT_METHOD.MANUAL_WAIVER
        ? PAYMENT_STATUS.CAPTURED // No payment needed
        : PAYMENT_STATUS.PENDING;

      // e. Create the Appointment
      const newAppointment = await tx.appointment.create({
        data: {
          slotId: data.slotId,
          clinicId: slot.clinicId,
          providerId: slot.providerId,
          specialtyId,
          serviceId: data.serviceId,
          patientName: data.patientName.trim(),
          patientDob: dob,
          patientPhone: data.patientPhone.trim(),
          patientEmail: data.patientEmail.trim(),
          patientType: data.patientType,
          guardianName: data.guardianName?.trim() || null,
          guardianRelation: data.guardianRelation?.trim() || null,
          reasonForVisit: data.reasonForVisit.trim(),
          modality: slot.modality,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isDemoInsurance: !!data.isDemoInsurance,
          depositCents: data.depositCents || 0,
          selfPayCents: data.selfPayCents || 0,
          paymentMethod: data.paymentMethod,
          paymentStatus,
          status: APPOINTMENT_STATUS.BOOKED,
          ipHash: hashIpAddress(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"),
        },
        include: {
          clinic: true,
          provider: true,
          specialty: true,
          service: true,
        },
      });

      // f. Create the AppointmentLedger entry
      const ledgerDescription = data.paymentMethod === PAYMENT_METHOD.MANUAL_WAIVER
        ? "Demo insurance — no payment required"
        : data.paymentMethod === PAYMENT_METHOD.CASH_AT_DESK
          ? "Self-pay — cash payment pending at desk"
          : "Online payment — deposit authorized";

      await tx.appointmentLedger.create({
        data: {
          appointmentId: newAppointment.id,
          type: LEDGER_TYPE.DEPOSIT_AUTH,
          amountCents: data.depositCents || 0,
          description: ledgerDescription,
          processedBy: "SYSTEM",
        },
      });

      // g. Delete the lock and update slot to BOOKED
      await tx.slotLock.delete({ where: { slotId: data.slotId } });
      await tx.slot.update({
        where: { id: data.slotId },
        data: { status: SLOT_STATUS.BOOKED },
      });

      return newAppointment;
    });

    // ---- 5. Generate secure tokens (outside transaction) ----
    const tokenExpiresAt = new Date(
      appointment.startTime.getTime() +
        TOKEN_EXPIRY_DAYS_AFTER_APPOINTMENT * 24 * 60 * 60 * 1000
    );

    // Generate MANAGE token (always needed)
    const manageRawToken = generateSecureToken();
    const manageHash = hashToken(manageRawToken);

    // Generate INTAKE token
    const intakeRawToken = generateSecureToken();
    const intakeHash = hashToken(intakeRawToken);

    // Generate REVIEW token
    const reviewRawToken = generateSecureToken();
    const reviewHash = hashToken(reviewRawToken);

    // Generate CHECK_IN token
    const checkInRawToken = generateSecureToken();
    const checkInHash = hashToken(checkInRawToken);

    // Batch-create all tokens
    await db.token.createMany({
      data: [
        { tokenHash: manageHash, appointmentId: appointment.id, purpose: TOKEN_PURPOSE.MANAGE, expiresAt: tokenExpiresAt },
        { tokenHash: intakeHash, appointmentId: appointment.id, purpose: TOKEN_PURPOSE.INTAKE, expiresAt: tokenExpiresAt },
        { tokenHash: reviewHash, appointmentId: appointment.id, purpose: TOKEN_PURPOSE.REVIEW, expiresAt: tokenExpiresAt },
        { tokenHash: checkInHash, appointmentId: appointment.id, purpose: TOKEN_PURPOSE.CHECK_IN, expiresAt: tokenExpiresAt },
      ],
    });

    // ---- 6. Audit log (fire-and-forget) ----
    createAuditLog({
      action: AUDIT_ACTIONS.BOOKING_CREATED,
      targetType: "APPOINTMENT",
      targetId: appointment.id,
      appointmentId: appointment.id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    // ---- 7. Invalidate caches ----
    cache.deleteByPrefix("slots:");
    cache.deleteByPrefix("search:");
    cache.deleteByPrefix("clinic:");

    // ---- 8. Return response ----
    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        modality: appointment.modality,
        status: appointment.status,
        patientName: appointment.patientName,
        patientType: appointment.patientType,
        reasonForVisit: appointment.reasonForVisit,
        paymentMethod: appointment.paymentMethod,
        paymentStatus: appointment.paymentStatus,
        depositCents: appointment.depositCents,
        selfPayCents: appointment.selfPayCents,
        clinicName: appointment.clinic.name,
        providerName: `${appointment.provider.firstName} ${appointment.provider.lastName}`,
        providerCredentials: appointment.provider.credentials || undefined,
        serviceName: appointment.service.name,
        specialtyName: appointment.specialty.name,
      },
      token: manageRawToken, // Primary token for the patient (manage link)
    });
  } catch (error) {
    if (error instanceof PublicBookingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This time slot was just booked by someone else. Please try another.", code: "SLOT_TAKEN" },
        { status: 409 }
      );
    }

    console.error("[APPOINTMENTS_POST] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// =============================================================================
// Custom Error
// =============================================================================

class PublicBookingError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "PublicBookingError";
    this.code = code;
    this.status = status;
  }
}