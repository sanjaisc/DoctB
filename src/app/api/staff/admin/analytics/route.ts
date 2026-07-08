import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { startOfDay, subDays, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const period = request.nextUrl.searchParams.get("period") || "30d";
    const dateFromParam = request.nextUrl.searchParams.get("dateFrom");
    const dateToParam = request.nextUrl.searchParams.get("dateTo");

    let dateFrom: Date;
    let dateTo: Date = new Date();

    if (dateFromParam && dateToParam) {
      dateFrom = new Date(dateFromParam);
      dateTo = new Date(dateToParam);
    } else {
      const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
      dateFrom = subDays(startOfDay(new Date()), days);
    }

    const cacheKey = `admin:analytics:${format(dateFrom, "yyyy-MM-dd")}:${format(dateTo, "yyyy-MM-dd")}`;

    const data = await cache.getOrSet(cacheKey, async () => {
      const appointments = await db.appointment.findMany({
        where: {
          startTime: { gte: dateFrom, lte: dateTo },
        },
        select: {
          id: true,
          status: true,
          modality: true,
          startTime: true,
          depositCents: true,
          paymentStatus: true,
          conversionRanking: true,
          providerId: true,
          clinicId: true,
        },
      });

      const total = appointments.length;

      // Daily volume
      const dailyMap: Record<string, { date: string; booked: number; checkedIn: number; completed: number; cancelled: number; noShow: number }> = {};
      for (const a of appointments) {
        const day = format(a.startTime, "yyyy-MM-dd");
        if (!dailyMap[day]) {
          dailyMap[day] = { date: day, booked: 0, checkedIn: 0, completed: 0, cancelled: 0, noShow: 0 };
        }
        if (a.status === "BOOKED") dailyMap[day].booked++;
        else if (a.status === "CHECKED_IN") dailyMap[day].checkedIn++;
        else if (a.status === "COMPLETED") dailyMap[day].completed++;
        else if (a.status === "CANCELLED") dailyMap[day].cancelled++;
        else if (a.status === "NO_SHOW") dailyMap[day].noShow++;
      }
      const dailyVolume = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

      // Modality split
      const inPerson = appointments.filter((a) => a.modality === "IN_PERSON").length;
      const video = appointments.filter((a) => a.modality === "VIDEO").length;

      // No-show rate
      const noShows = appointments.filter((a) => a.status === "NO_SHOW").length;
      const completedOrCheckedIn = appointments.filter((a) => ["COMPLETED", "CHECKED_IN"].includes(a.status)).length;
      const noShowRate = total > 0 ? ((noShows / total) * 100) : 0;

      // Conversion metrics
      const withRanking = appointments.filter((a) => a.conversionRanking);
      const earliest = withRanking.filter((a) => a.conversionRanking === "EARLIEST").length;
      const nearest = withRanking.filter((a) => a.conversionRanking === "NEAREST").length;
      const totalWithRanking = withRanking.length;

      // Deposit capture volume
      const capturedDeposits = appointments
        .filter((a) => a.paymentStatus === "CAPTURED" || a.paymentStatus === "REFUNDED")
        .reduce((sum, a) => sum + a.depositCents, 0);
      const pendingDeposits = appointments
        .filter((a) => a.paymentStatus === "PENDING" || a.paymentStatus === "AUTHORIZED")
        .reduce((sum, a) => sum + a.depositCents, 0);

      // Completion rate
      const completed = appointments.filter((a) => a.status === "COMPLETED").length;
      const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
      const completionRate = appointments.filter((a) => a.status !== "BOOKED").length > 0
        ? ((completed / appointments.filter((a) => a.status !== "BOOKED").length) * 100)
        : 0;
      const cancellationRate = appointments.filter((a) => a.status !== "BOOKED").length > 0
        ? ((cancelled / appointments.filter((a) => a.status !== "BOOKED").length) * 100)
        : 0;

      // Busiest day
      const dayCount: Record<string, number> = {};
      for (const a of appointments) {
        const day = format(a.startTime, "EEEE");
        dayCount[day] = (dayCount[day] || 0) + 1;
      }
      const busiestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      return {
        total,
        completed,
        cancelled,
        noShows,
        completionRate: Math.round(completionRate * 10) / 10,
        cancellationRate: Math.round(cancellationRate * 10) / 10,
        noShowRate: Math.round(noShowRate * 10) / 10,
        dailyVolume,
        modalitySplit: { inPerson, video },
        depositCapture: { captured: capturedDeposits, pending: pendingDeposits },
        conversion: {
          totalWithRanking,
          earliest,
          nearest,
          recommendationAcceptance: totalWithRanking > 0 ? Math.round((earliest / totalWithRanking) * 1000) / 10 : 0,
        },
        busiestDay,
        avgDaily: Math.round(total / Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)))),
      };
    }, 300); // 5 min cache

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[ADMIN_ANALYTICS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
