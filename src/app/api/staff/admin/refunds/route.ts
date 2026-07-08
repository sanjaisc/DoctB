import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { appointmentId, amountCents } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, status: true, depositCents: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (!["BOOKED", "CHECKED_IN", "COMPLETED"].includes(appointment.status)) {
      return NextResponse.json({ error: "Cannot refund appointment in current status" }, { status: 400 });
    }

    const refundAmount = amountCents ?? appointment.depositCents;

    await db.appointmentLedger.create({
      data: {
        appointmentId,
        type: "REFUND",
        amountCents: refundAmount,
        refundStatus: "REFUND_PENDING",
        description: `Manual refund initiated by ${session.user.name} (SYSTEM_MANAGER)`,
        processedBy: session.user.id,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.REFUND_INITIATED,
      targetType: "APPOINTMENT",
      targetId: appointmentId,
    });

    return NextResponse.json({
      success: true,
      note: "Refund queued. Stripe is not configured — process the refund manually in your payment dashboard.",
      refundAmount,
    });
  } catch (error) {
    console.error("[ADMIN_REFUND_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
