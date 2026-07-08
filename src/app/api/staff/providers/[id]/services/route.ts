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
    const existing = await db.provider.findUnique({ where: { id }, select: { clinicId: true } });
    if (!existing) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const clinicId = session.user.clinicId;
    const role = session.user.role;
    if (role !== "SYSTEM_MANAGER" && clinicId && existing.clinicId !== clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { serviceIds }: { serviceIds: string[] } = await request.json();
    if (!Array.isArray(serviceIds)) {
      return NextResponse.json({ error: "serviceIds must be an array" }, { status: 400 });
    }

    // Validate service IDs exist
    const existingServices = await db.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true },
    });
    const validIds = new Set(existingServices.map((s) => s.id));
    const validServiceIds = serviceIds.filter((sid) => validIds.has(sid));

    // Replace all service assignments
    await db.$transaction([
      db.providerService.deleteMany({ where: { providerId: id } }),
      ...(validServiceIds.length > 0
        ? [db.providerService.createMany({
            data: validServiceIds.map((serviceId) => ({
              providerId: id,
              serviceId,
            })),
          })]
        : []),
    ]);

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.PROVIDER_UPDATED, targetType: "PROVIDER", targetId: id });
    return NextResponse.json({ success: true, count: validServiceIds.length });
  } catch (error) {
    console.error("[STAFF_PROVIDER_SERVICES_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
