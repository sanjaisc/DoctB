import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { APPOINTMENT_STATUS, SLOT_STATUS } from "@/lib/enums";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { format } from "date-fns";

// =============================================================================
// POST — Reschedule a BOOKED appointment to a new slot
// =============================================================================

interface RescheduleBody {
  newSlotId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ---- 1. Auth check ----
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffId = session.user.id;
    const staffName = session.user.name || "Unknown Staff";
    const clinicId = session.user.clinicId;
    if (!clinicId) {
      return NextResponse.json(
        { error: "No clinic assigned to this user" },
        { status: 400 }
      );
    }

    const { id: appointmentId } = await params;

    // ---- 2. Parse body ----
    let body: RescheduleBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!body.newSlotId) {
      return NextResponse.json(
        { error: "Missing required field: newSlotId" },
        { status: 400 }
      );
    }

    // ---- 3. Validate appointment ----
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Check clinic access
    if (appointment.clinicId !== clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check status — only BOOKED can be rescheduled
    if (appointment.status !== APPOINTMENT_STATUS.BOOKED) {
      return NextResponse.json(
        { error: `Cannot reschedule appointment with status: ${appointment.status}` },
        { status: 409 }
      );
    }

    // ---- 4. Validate new slot ----
    const newSlot = await db.slot.findUnique({
      where: { id: body.newSlotId },
      include: {
        provider: {
          include: {
            providerServices: {
              include: {
                service: {
                  select: { specialtyId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!newSlot) {
      return NextResponse.json(
        { error: "New slot not found" },
        { status: 404 }
      );
    }

    if (newSlot.clinicId !== clinicId) {
      return NextResponse.json(
        { error: "Slot does not belong to your clinic" },
        { status: 403 }
      );
    }

    if (newSlot.status !== SLOT_STATUS.AVAILABLE) {
      return NextResponse.json(
        { error: `Slot is no longer available (status: ${newSlot.status})` },
        { status: 409 }
      );
    }

    // ---- 5. Determine new specialtyId from the new slot's provider ----
    const firstProviderService = newSlot.provider.providerServices[0];
    const newSpecialtyId = firstProviderService?.service?.specialtyId || null;

    // Format old/new datetimes for the note
    const oldStart = format(new Date(appointment.startTime), "MMM d, yyyy 'at' h:mm a");
    const newStart = format(new Date(newSlot.startTime), "MMM d, yyyy 'at' h:mm a");
    const noteText = `Rescheduled from ${oldStart} to ${newStart} by ${staffName}`;

    // ---- 6. Atomic transaction ----
    const updated = await db.$transaction(async (tx) => {
      // a. Release old slot back to AVAILABLE
      await tx.slot.update({
        where: { id: appointment.slotId },
        data: { status: SLOT_STATUS.AVAILABLE },
      });

      // b. Update the appointment with new slot data
      const updatedApt = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          slotId: newSlot.id,
          providerId: newSlot.providerId,
          specialtyId: newSpecialtyId,
          modality: newSlot.modality,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
          cancellationReason: null,
        },
        include: {
          provider: {
            select: { id: true, firstName: true, lastName: true, credentials: true },
          },
          service: { select: { id: true, name: true } },
          slot: { select: { id: true, modality: true, status: true, startTime: true, endTime: true } },
          insurance: { select: { id: true, name: true, isDemo: true } },
        },
      });

      // c. Book the new slot
      await tx.slot.update({
        where: { id: newSlot.id },
        data: { status: SLOT_STATUS.BOOKED },
      });

      // d. Add internal note
      await tx.internalNote.create({
        data: {
          appointmentId,
          authorId: staffId,
          content: noteText,
        },
      });

      return updatedApt;
    });

    // ---- 7. Audit log ----
    createAuditLog({
      userId: staffId,
      action: AUDIT_ACTIONS.BOOKING_RESCHEDULED,
      targetType: "APPOINTMENT",
      targetId: appointmentId,
      appointmentId,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[STAFF_APPOINTMENT_RESCHEDULE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}