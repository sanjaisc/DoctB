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

    const includePast = request.nextUrl.searchParams.get("includePast") === "true";
    const now = new Date();

    const closures = await db.clinicClosure.findMany({
      where: {
        clinicId,
        ...(includePast ? {} : { endDate: { gte: now } }),
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ data: closures });
  } catch (error) {
    console.error("[STAFF_CLOSURES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const { title, startDate, endDate, isRecurring, recurrenceRule } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: "title, startDate, and endDate are required" }, { status: 400 });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: "endDate must be on or after startDate" }, { status: 400 });
    }

    const closure = await db.clinicClosure.create({
      data: {
        clinicId,
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isRecurring: isRecurring || false,
        recurrenceRule: recurrenceRule || null,
      },
    });

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.CLOSURE_CREATED, targetType: "CLOSURE", targetId: closure.id });
    return NextResponse.json({ data: closure }, { status: 201 });
  } catch (error) {
    console.error("[STAFF_CLOSURES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
