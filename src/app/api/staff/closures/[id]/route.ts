import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.clinicClosure.findUnique({
      where: { id },
      select: { clinicId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Closure not found" }, { status: 404 });
    }

    const clinicId = session.user.clinicId;
    const role = session.user.role;
    if (role !== "SYSTEM_MANAGER" && clinicId && existing.clinicId !== clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ["title", "startDate", "endDate", "isRecurring", "recurrenceRule"];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = field === "startDate" || field === "endDate" ? new Date(body[field]) : body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await db.clinicClosure.update({
      where: { id },
      data: updateData,
    });

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.CLOSURE_UPDATED, targetType: "CLOSURE", targetId: id });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[STAFF_CLOSURE_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.clinicClosure.findUnique({
      where: { id },
      select: { clinicId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Closure not found" }, { status: 404 });
    }

    const clinicId = session.user.clinicId;
    const role = session.user.role;
    if (role !== "SYSTEM_MANAGER" && clinicId && existing.clinicId !== clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.clinicClosure.delete({ where: { id } });

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.CLOSURE_DELETED, targetType: "CLOSURE", targetId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STAFF_CLOSURE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
