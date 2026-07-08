import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { CLINIC_STATUS, CLINIC_STATUSES } from "@/lib/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!status || !CLINIC_STATUSES.includes(status as any)) {
      return NextResponse.json({ error: `Invalid status. Use: ${CLINIC_STATUSES.join(", ")}` }, { status: 400 });
    }

    const clinic = await db.clinic.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    // Validate transitions
    const from = clinic.status;
    const VALID_TRANSITIONS: Record<string, string[]> = {
      DRAFT: ["PENDING", "PUBLISHED"],
      PENDING: ["PUBLISHED", "SUSPENDED"],
      PUBLISHED: ["SUSPENDED", "ARCHIVED"],
      SUSPENDED: ["DRAFT", "PUBLISHED"],
      ARCHIVED: ["DRAFT"],
    };

    if (!VALID_TRANSITIONS[from]?.includes(status)) {
      return NextResponse.json({
        error: `Cannot transition from ${from} to ${status}. Allowed: ${(VALID_TRANSITIONS[from] || []).join(", ") || "none"}`,
      }, { status: 400 });
    }

    await db.clinic.update({ where: { id }, data: { status } });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.CLINIC_STATUS_CHANGED,
      targetType: "CLINIC",
      targetId: id,
    });

    return NextResponse.json({ success: true, from, to: status });
  } catch (error) {
    console.error("[CLINIC_STATUS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
