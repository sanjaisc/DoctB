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

    const fields = await db.intakeField.findMany({
      where: { clinicId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: fields });
  } catch (error) {
    console.error("[INTAKE_FIELDS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "CLINIC_RECEPTION") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = request.nextUrl.searchParams.get("clinicId") || session.user.clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic specified" }, { status: 400 });
    }

    if (session.user.role !== "SYSTEM_MANAGER" && session.user.clinicId && clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { label, fieldType, options, required } = body;

    if (!label) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }

    if (!["text", "textarea", "select", "checkbox"].includes(fieldType)) {
      return NextResponse.json({ error: "Invalid fieldType" }, { status: 400 });
    }

    const maxSort = await db.intakeField.findFirst({
      where: { clinicId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const field = await db.intakeField.create({
      data: {
        clinicId,
        label,
        fieldType: fieldType || "text",
        options: options || null,
        required: required || false,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    });

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.INTAKE_MAPPING_UPDATED, targetType: "CLINIC", targetId: clinicId });
    return NextResponse.json({ data: field }, { status: 201 });
  } catch (error) {
    console.error("[INTAKE_FIELDS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
