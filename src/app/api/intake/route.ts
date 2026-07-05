// =============================================================================
// Intake Form API — GET & POST /api/intake?token=<raw_64_char_hex>
// =============================================================================
// Public, token-based access for patients to view and submit pre-visit
// intake forms. Token purpose must be INTAKE.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { TOKEN_PURPOSE } from "@/lib/enums";
import { isAfter } from "date-fns";

// =============================================================================
// GET — Retrieve appointment details + any existing intake data
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const rawToken = request.nextUrl.searchParams.get("token");

    // Validate token presence
    if (!rawToken) {
      return NextResponse.json(
        { error: "Missing token parameter" },
        { status: 400 }
      );
    }

    // Validate token format (must be 64-char hex)
    if (!/^[0-9a-fA-F]{64}$/.test(rawToken)) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Hash the raw token for database lookup
    const tokenHash = hashToken(rawToken);

    // Look up token with appointment details
    const tokenRecord = await db.token.findUnique({
      where: { tokenHash },
      include: {
        appointment: {
          include: {
            provider: true,
            service: true,
            specialty: true,
            clinic: true,
            insurance: true,
            notes: {
              where: {
                content: { startsWith: "[INTAKE_FORM]" },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    // Token not found
    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Check purpose is INTAKE
    if (tokenRecord.purpose !== TOKEN_PURPOSE.INTAKE) {
      return NextResponse.json(
        { error: "Invalid token purpose" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (isAfter(new Date(), tokenRecord.expiresAt)) {
      return NextResponse.json(
        { error: "This intake link has expired" },
        { status: 410 }
      );
    }

    const { appointment } = tokenRecord;

    // Parse existing intake data if present
    let existingIntakeData: Record<string, string> | null = null;
    if (appointment.notes.length > 0) {
      try {
        const rawContent = appointment.notes[0].content;
        const jsonStr = rawContent.replace("[INTAKE_FORM] ", "");
        existingIntakeData = JSON.parse(jsonStr);
      } catch {
        // Ignore parse errors — treat as no existing data
      }
    }

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        patientName: appointment.patientName,
        provider: {
          firstName: appointment.provider.firstName,
          lastName: appointment.provider.lastName,
          credentials: appointment.provider.credentials,
        },
        clinic: {
          name: appointment.clinic.name,
          streetAddress: appointment.clinic.streetAddress,
          city: appointment.clinic.city,
          state: appointment.clinic.state,
          zipCode: appointment.clinic.zipCode,
        },
        service: {
          name: appointment.service.name,
        },
        specialty: {
          name: appointment.specialty.name,
        },
        insurance: appointment.insurance
          ? { name: appointment.insurance.name }
          : null,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        modality: appointment.modality,
        intakeCompleted: appointment.intakeCompleted,
      },
      existingIntakeData,
    });
  } catch (error) {
    console.error("[INTAKE_GET] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST — Submit intake form data
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    let body: { token?: string; formData?: Record<string, string> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const rawToken = body.token;
    const formData = body.formData;

    // Validate token presence and format
    if (!rawToken || typeof rawToken !== "string") {
      return NextResponse.json(
        { error: "Missing token parameter" },
        { status: 400 }
      );
    }

    if (!/^[0-9a-fA-F]{64}$/.test(rawToken)) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Validate formData
    if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
      return NextResponse.json(
        { error: "Missing or invalid formData" },
        { status: 400 }
      );
    }

    // Hash the raw token for database lookup
    const tokenHash = hashToken(rawToken);

    // Look up token
    const tokenRecord = await db.token.findUnique({
      where: { tokenHash },
      include: {
        appointment: {
          include: {
            notes: {
              where: {
                content: { startsWith: "[INTAKE_FORM]" },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    // Token not found
    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Check purpose is INTAKE
    if (tokenRecord.purpose !== TOKEN_PURPOSE.INTAKE) {
      return NextResponse.json(
        { error: "Invalid token purpose" },
        { status: 400 }
      );
    }

    // Check if already consumed
    if (tokenRecord.consumedAt) {
      return NextResponse.json(
        { error: "This intake form has already been submitted" },
        { status: 400 }
      );
    }

    // Check if expired
    if (isAfter(new Date(), tokenRecord.expiresAt)) {
      return NextResponse.json(
        { error: "This intake link has expired" },
        { status: 410 }
      );
    }

    const { appointment } = tokenRecord;
    const content = `[INTAKE_FORM] ${JSON.stringify(formData)}`;

    // Create or update the InternalNote linked to the appointment
    if (appointment.notes.length > 0) {
      // Update existing intake note
      await db.internalNote.update({
        where: { id: appointment.notes[0].id },
        data: { content },
      });
    } else {
      // Create new intake note
      await db.internalNote.create({
        data: {
          appointmentId: appointment.id,
          authorId: null,
          content,
        },
      });
    }

    // Mark appointment's intakeCompleted = true
    await db.appointment.update({
      where: { id: appointment.id },
      data: { intakeCompleted: true },
    });

    // Consume the token
    await db.token.update({
      where: { id: tokenRecord.id },
      data: { consumedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INTAKE_POST] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}