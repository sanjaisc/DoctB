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

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { commonInstructions: true },
    });

    return NextResponse.json({
      commonInstructions: clinic?.commonInstructions || "",
    });
  } catch (error) {
    console.error("[INTAKE_MAPPING_GET]", error);
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
    const { commonInstructions } = body;

    if (commonInstructions !== undefined) {
      await db.clinic.update({
        where: { id: clinicId },
        data: { commonInstructions },
      });
    }

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.INTAKE_MAPPING_UPDATED, targetType: "CLINIC", targetId: clinicId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INTAKE_MAPPING_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
