import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { DoctASessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { STAFF_ROLE } from "@/lib/enums";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as DoctASessionUser;

    // Only SYSTEM_MANAGER can access this endpoint
    if (user.role !== STAFF_ROLE.SYSTEM_MANAGER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await cache.getOrSet("admin:dashboard", () => buildAdminData(), 60);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[ADMIN_DASHBOARD]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Data Builder — parallel Prisma queries
// ---------------------------------------------------------------------------

async function buildAdminData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [
    clinics,
    totalProviders,
    totalAppointments,
    totalReviews,
    avgPlatformRating,
    recentAuditLogs,
    staffUsers,
    lastLogins,
  ] = await Promise.all([
    // 1. All clinics with provider count and appointment counts
    db.clinic.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        status: true,
        providers: {
          where: { status: "ACTIVE" },
          select: { id: true, rating: true },
        },
        appointments: {
          where: {
            OR: [
              { startTime: { gte: todayStart, lte: todayEnd } },
              { startTime: { gte: weekStart, lte: weekEnd } },
            ],
          },
          select: { id: true, startTime: true },
        },
        reviews: {
          select: { overallRating: true },
        },
      },
      orderBy: { name: "asc" },
    }),

    // 2. Total provider count (active)
    db.provider.count({ where: { status: "ACTIVE" } }),

    // 3. Total appointments (all time)
    db.appointment.count(),

    // 4. Total reviews
    db.review.count(),

    // 5. Average platform rating
    db.review.aggregate({ _avg: { overallRating: true } }),

    // 6. Recent 20 audit logs across all clinics
    db.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, clinicId: true, clinic: { select: { name: true } } },
        },
      },
    }),

    // 7. All staff users
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clinicId: true,
        lastLoginAt: true,
        clinic: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),

    // 8. Last login times from AuditLog (STAFF_LOGIN action)
    db.auditLog.groupBy({
      by: ["userId"],
      where: { action: "STAFF_LOGIN", userId: { not: null } },
      _max: { createdAt: true },
    }),
  ]);

  // Build clinic summary with computed counts
  const clinicSummary = clinics.map((clinic) => {
    const todayAppts = clinic.appointments.filter(
      (a) => a.startTime >= todayStart && a.startTime <= todayEnd
    ).length;
    const weekAppts = clinic.appointments.filter(
      (a) => a.startTime >= weekStart && a.startTime <= weekEnd
    ).length;
    const providerCount = clinic.providers.length;
    const avgRating =
      clinic.reviews.length > 0
        ? clinic.reviews.reduce((sum, r) => sum + r.overallRating, 0) /
          clinic.reviews.length
        : 0;

    return {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      city: clinic.city,
      status: clinic.status,
      providerCount,
      todayAppts,
      weekAppts,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  });

  // Build recent activity
  const recentActivity = recentAuditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    createdAt: log.createdAt.toISOString(),
    userName: log.user?.name ?? "System",
    clinicName: log.user?.clinic?.name ?? null,
  }));

  // Build last login lookup
  const loginLookup = new Map(
    lastLogins
      .filter((l) => l.userId && l._max.createdAt)
      .map((l) => [l.userId, l._max.createdAt!.toISOString()])
  );

  // Build staff list with last login from AuditLog
  const staffList = staffUsers.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    clinicName: s.clinic?.name ?? null,
    lastLogin: s.lastLoginAt?.toISOString() ?? (loginLookup.get(s.id) ?? null),
  }));

  return {
    clinicSummary,
    platformStats: {
      totalClinics: clinics.length,
      totalProviders,
      totalAppointments,
      totalReviews,
      avgRating: Math.round((avgPlatformRating._avg.overallRating ?? 0) * 10) / 10,
    },
    recentActivity,
    staffList,
  };
}