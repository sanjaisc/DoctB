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

    // Get all global services
    const allServices = await db.service.findMany({
      where: { isActive: true },
      include: { specialty: { select: { name: true } } },
      orderBy: [{ specialtyId: "asc" }, { sortOrder: "asc" }],
    });

    // Get services currently assigned to this clinic (via providers)
    const clinicProviderServices = await db.providerService.findMany({
      where: { provider: { clinicId } },
      select: { serviceId: true },
    });
    const assignedServiceIds = new Set(clinicProviderServices.map((ps) => ps.serviceId));

    // Also get clinic insurances
    const clinicInsurances = await db.clinicInsurance.findMany({
      where: { clinicId },
      select: { insuranceId: true },
    });
    const assignedInsuranceIds = new Set(clinicInsurances.map((ci) => ci.insuranceId));

    // Mark which services are "assigned" (have at least one provider offering them)
    const assigned = allServices.filter((s) => assignedServiceIds.has(s.id));
    const unassigned = allServices.filter((s) => !assignedServiceIds.has(s.id));

    return NextResponse.json({
      all: allServices,
      assigned,
      unassigned,
      assignedServiceIds: Array.from(assignedServiceIds),
      assignedInsuranceIds: Array.from(assignedInsuranceIds),
    });
  } catch (error) {
    console.error("[STAFF_SERVICES_GET]", error);
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

    const body = await request.json();
    const { serviceIds, selfPayRateCents, servicePaymentTypes } = body;

    // Update self-pay flat rate if provided
    if (selfPayRateCents !== undefined) {
      await db.clinic.update({
        where: { id: clinicId },
        data: { selfPayFlatRateCents: selfPayRateCents },
      });
    }

    // Update per-service payment types if provided
    if (servicePaymentTypes && typeof servicePaymentTypes === "object") {
      for (const [serviceId, paymentType] of Object.entries(servicePaymentTypes)) {
        await db.service.updateMany({
          where: { id: serviceId },
          data: { selfPayPaymentType: paymentType as string },
        });
      }
    }

    // Assign services to all providers in the clinic
    if (Array.isArray(serviceIds)) {
      const providers = await db.provider.findMany({
        where: { clinicId },
        select: { id: true },
      });

      // Remove unselected services from all providers
      await db.providerService.deleteMany({
        where: {
          provider: { clinicId },
          NOT: { serviceId: { in: serviceIds } },
        },
      });

      // Add newly selected services to all providers
      const existingAssignments = await db.providerService.findMany({
        where: { provider: { clinicId } },
        select: { providerId: true, serviceId: true },
      });
      const existingSet = new Set(existingAssignments.map((a) => `${a.providerId}:${a.serviceId}`));

      for (const provider of providers) {
        for (const serviceId of serviceIds) {
          if (!existingSet.has(`${provider.id}:${serviceId}`)) {
            await db.providerService.create({
              data: { providerId: provider.id, serviceId },
            }).catch(() => {}); // ignore unique constraint violations
          }
        }
      }
    }

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.SERVICE_UPDATED, targetType: "CLINIC", targetId: clinicId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STAFF_SERVICES_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
