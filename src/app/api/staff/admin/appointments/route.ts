import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const q = request.nextUrl.searchParams.get("q") || "";
    const clinicId = request.nextUrl.searchParams.get("clinicId") || undefined;
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const dateFrom = request.nextUrl.searchParams.get("dateFrom") || undefined;
    const dateTo = request.nextUrl.searchParams.get("dateTo") || undefined;
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize")) || 20));

    const where: Record<string, unknown> = {};
    if (clinicId) where.clinicId = clinicId;
    if (status) where.status = status;

    if (q) {
      const searchLower = q.toLowerCase();
      where.OR = [
        { patientName: { contains: searchLower } },
        { patientEmail: { contains: searchLower } },
        { patientPhone: { contains: searchLower } },
      ];

      // Try token search
      const tokenEntry = await db.token.findFirst({
        where: { tokenHash: { contains: searchLower } },
        select: { appointmentId: true },
      });
      if (tokenEntry) {
        where.OR.push({ id: tokenEntry.appointmentId });
      }
    }

    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) (where.startTime as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.startTime as Record<string, unknown>).lte = new Date(dateTo);
    }

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where: where as any,
        include: {
          clinic: { select: { id: true, name: true, slug: true } },
          provider: { select: { id: true, firstName: true, lastName: true, credentials: true } },
          service: { select: { id: true, name: true } },
          insurance: { select: { id: true, name: true } },
        },
        orderBy: { startTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.appointment.count({ where: where as any }),
    ]);

    // Compute duplicate patient counts (same email or phone) for the returned results
    const emails = [...new Set(appointments.map((a) => a.patientEmail).filter(Boolean))];
    const phones = [...new Set(appointments.map((a) => a.patientPhone).filter(Boolean))];
    const [emailCounts, phoneCounts] = await Promise.all([
      emails.length > 0
        ? db.appointment.groupBy({ by: ["patientEmail"], where: { patientEmail: { in: emails } }, _count: true })
        : Promise.resolve([]),
      phones.length > 0
        ? db.appointment.groupBy({ by: ["patientPhone"], where: { patientPhone: { in: phones } }, _count: true })
        : Promise.resolve([]),
    ]);
    const emailCountMap = new Map(emailCounts.map((e) => [e.patientEmail, e._count]));
    const phoneCountMap = new Map(phoneCounts.map((p) => [p.patientPhone, p._count]));

    const data = appointments.map((a) => {
      const sameEmail = a.patientEmail ? (emailCountMap.get(a.patientEmail) || 1) - 1 : 0;
      const samePhone = a.patientPhone ? (phoneCountMap.get(a.patientPhone) || 1) - 1 : 0;
      return {
        id: a.id,
        patientName: a.patientName,
        patientEmail: a.patientEmail,
        patientPhone: a.patientPhone,
        clinicId: a.clinicId,
        clinicName: a.clinic.name,
        clinicSlug: a.clinic.slug,
        providerId: a.providerId,
        providerName: `Dr. ${a.provider.firstName} ${a.provider.lastName}${a.provider.credentials ? `, ${a.provider.credentials}` : ""}`,
        serviceName: a.service.name,
        insuranceName: a.insurance?.name || "Self-Pay",
        status: a.status,
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
        modality: a.modality,
        depositCents: a.depositCents,
        paymentStatus: a.paymentStatus,
        duplicateEmailCount: sameEmail,
        duplicatePhoneCount: samePhone,
      };
    });

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[ADMIN_APPOINTMENTS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
