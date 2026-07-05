import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/enums";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  // ---- Auth check ----
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !hasMinimumRole(session.user.role, "CLINIC_RECEPTION")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---- Resolve params ----
  const { appointmentId } = await params;

  // ---- Fetch appointment and verify clinic access ----
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientName: true, clinicId: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Non-SYSTEM_MANAGER staff can only access their own clinic's appointments
  const userRole = session.user.role;
  const userClinicId = session.user.clinicId;
  if (userRole !== "SYSTEM_MANAGER" && userClinicId && appointment.clinicId !== userClinicId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ---- Find valid MANAGE token ----
  const manageToken = await db.token.findFirst({
    where: {
      appointmentId: appointment.id,
      purpose: "MANAGE",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!manageToken) {
    return NextResponse.json(
      { error: "No valid management token found for this appointment" },
      { status: 404 }
    );
  }

  // ---- Build the management URL ----
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const manageUrl = `${baseUrl}/manage/${manageToken.id}`;

  // ---- Generate QR code as data URL ----
  try {
    const qrDataUrl = await QRCode.toDataURL(manageUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: "#065f46", // emerald-800
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });

    return NextResponse.json({
      qrDataUrl,
      appointmentId: appointment.id,
      patientName: appointment.patientName,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}