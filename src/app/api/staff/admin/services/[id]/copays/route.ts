import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const copays = await db.serviceInsurance.findMany({
      where: { serviceId: id },
      include: { insurance: { select: { id: true, name: true, isDemo: true } } },
      orderBy: { insurance: { sortOrder: "asc" } },
    });
    return NextResponse.json({ data: copays });
  } catch (error) {
    console.error("[SERVICE_COPAYS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const entries: { insuranceId: string; copayCents: number }[] = body.entries;

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: "entries array required" }, { status: 400 });
    }

    // Upsert each copay entry
    for (const entry of entries) {
      await db.serviceInsurance.upsert({
        where: { serviceId_insuranceId: { serviceId: id, insuranceId: entry.insuranceId } },
        create: { serviceId: id, insuranceId: entry.insuranceId, copayCents: entry.copayCents },
        update: { copayCents: entry.copayCents },
      });
    }

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.INSURANCE_UPDATED,
      targetType: "SERVICE",
      targetId: id,
    });

    const copays = await db.serviceInsurance.findMany({
      where: { serviceId: id },
      include: { insurance: { select: { id: true, name: true, isDemo: true } } },
    });
    return NextResponse.json({ data: copays });
  } catch (error) {
    console.error("[SERVICE_COPAYS_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
