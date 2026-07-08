import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = request.nextUrl.searchParams.get("clinicId") || session.user.clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic specified" }, { status: 400 });
    }

    if (session.user.role !== "SYSTEM_MANAGER" && session.user.clinicId && clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [allInsurances, clinicInsurances] = await Promise.all([
      db.insurance.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      db.clinicInsurance.findMany({ where: { clinicId }, select: { insuranceId: true } }),
    ]);

    const selectedIds = new Set(clinicInsurances.map((ci) => ci.insuranceId));
    const selected = allInsurances.filter((i) => selectedIds.has(i.id));
    const unselected = allInsurances.filter((i) => !selectedIds.has(i.id));

    return NextResponse.json({ all: allInsurances, selected, unselected });
  } catch (error) {
    console.error("[STAFF_INSURANCES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = request.nextUrl.searchParams.get("clinicId") || session.user.clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic specified" }, { status: 400 });
    }

    if (session.user.role !== "SYSTEM_MANAGER" && session.user.clinicId && clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { insuranceIds }: { insuranceIds: string[] } = await request.json();
    if (!Array.isArray(insuranceIds)) {
      return NextResponse.json({ error: "insuranceIds must be an array" }, { status: 400 });
    }

    await db.$transaction([
      db.clinicInsurance.deleteMany({ where: { clinicId } }),
      ...(insuranceIds.length > 0
        ? [db.clinicInsurance.createMany({
            data: insuranceIds.map((insuranceId) => ({ clinicId, insuranceId })),
          })]
        : []),
    ]);

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.INSURANCE_UPDATED, targetType: "CLINIC", targetId: clinicId });
    return NextResponse.json({ success: true, count: insuranceIds.length });
  } catch (error) {
    console.error("[STAFF_INSURANCES_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
