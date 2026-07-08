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

    const providerId = request.nextUrl.searchParams.get("providerId");
    if (!providerId) {
      return NextResponse.json({ error: "providerId is required" }, { status: 400 });
    }

    const provider = await db.provider.findUnique({
      where: { id: providerId },
      select: { clinicId: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const clinicId = session.user.clinicId;
    const role = session.user.role;
    if (role !== "SYSTEM_MANAGER" && clinicId && provider.clinicId !== clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await db.slotTemplate.findMany({
      where: { providerId, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("[STAFF_TEMPLATES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { providerId, dayOfWeek, startTime, endTime, modality } = body;

    if (!providerId || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: "providerId, dayOfWeek, startTime, and endTime are required" }, { status: 400 });
    }

    const provider = await db.provider.findUnique({
      where: { id: providerId },
      select: { clinicId: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const clinicId = session.user.clinicId;
    const role = session.user.role;
    if (role !== "SYSTEM_MANAGER" && clinicId && provider.clinicId !== clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const template = await db.slotTemplate.create({
      data: {
        providerId,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        modality: modality || "IN_PERSON",
        isActive: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.TEMPLATE_CREATED,
      targetType: "TEMPLATE",
      targetId: template.id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("[STAFF_TEMPLATES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
