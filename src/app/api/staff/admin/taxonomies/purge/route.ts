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
    if (!body.confirm) {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }

    const [specialties, services, insurances, serviceInsurances] = await Promise.all([
      db.specialty.deleteMany({ where: { isActive: false } }),
      db.service.deleteMany({ where: { isActive: false } }),
      db.insurance.deleteMany({ where: { isActive: false } }),
      db.serviceInsurance.deleteMany({ where: { isActive: false } }),
    ]);

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.TAXONOMY_PURGED,
      targetType: "SYSTEM",
      targetId: "purge",
    });

    return NextResponse.json({
      purged: true,
      counts: {
        specialties: specialties.count,
        services: services.count,
        insurances: insurances.count,
        serviceInsurances: serviceInsurances.count,
      },
    });
  } catch (error) {
    console.error("[TAXONOMY_PURGE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
