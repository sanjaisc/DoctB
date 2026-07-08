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

    const action = request.nextUrl.searchParams.get("action") || undefined;
    const userId = request.nextUrl.searchParams.get("userId") || undefined;
    const clinicId = request.nextUrl.searchParams.get("clinicId") || undefined;
    const dateFrom = request.nextUrl.searchParams.get("dateFrom") || undefined;
    const dateTo = request.nextUrl.searchParams.get("dateTo") || undefined;
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize")) || 30));

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
    }

    // If clinicId is specified, find audit logs related to that clinic
    if (clinicId) {
      where.OR = [
        { targetType: "CLINIC", targetId: clinicId },
        { targetType: "APPOINTMENT", appointmentId: { not: null } },
      ];
    }

    const format = request.nextUrl.searchParams.get("format");

    if (format === "csv") {
      const allLogs = await db.auditLog.findMany({
        where: where as any,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
      const header = "Timestamp,User,Email,Action,TargetType,TargetId,AppointmentId\n";
      const rows = allLogs.map((l) =>
        `"${l.createdAt.toISOString()}","${l.user?.name || "SYSTEM"}","${l.user?.email || ""}","${l.action}","${l.targetType || ""}","${l.targetId || ""}","${l.appointmentId || ""}"`
      ).join("\n");
      return new NextResponse(header + rows, {
        headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=audit-log.csv" },
      });
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: where as any,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where: where as any }),
    ]);

    const data = logs.map((l) => ({
      id: l.id,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      appointmentId: l.appointmentId,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
      userName: l.user?.name || "SYSTEM",
      userEmail: l.user?.email || "",
    }));

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[AUDIT_LOGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
