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
    const existing = await db.slotTemplate.findUnique({
      where: { id },
      include: { provider: { select: { clinicId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const clinicId = session.user.clinicId;
    const role = session.user.role;
    if (role !== "SYSTEM_MANAGER" && clinicId && existing.provider.clinicId !== clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ["dayOfWeek", "startTime", "endTime", "modality", "isActive"];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await db.slotTemplate.update({
      where: { id },
      data: updateData,
    });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.TEMPLATE_UPDATED,
      targetType: "TEMPLATE",
      targetId: id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[STAFF_TEMPLATE_PUT]", error);
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
    const existing = await db.slotTemplate.findUnique({
      where: { id },
      include: { provider: { select: { clinicId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const clinicId = session.user.clinicId;
    const role = session.user.role;
    if (role !== "SYSTEM_MANAGER" && clinicId && existing.provider.clinicId !== clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft-delete by deactivating
    await db.slotTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.TEMPLATE_DEACTIVATED,
      targetType: "TEMPLATE",
      targetId: id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STAFF_TEMPLATE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
