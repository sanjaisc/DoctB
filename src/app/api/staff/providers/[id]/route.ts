import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROVIDER_STATUSES } from "@/lib/enums";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const role = session.user.role;

    const provider = await db.provider.findUnique({ where: { id } });
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    if (role !== "SYSTEM_MANAGER" && role !== "CLINIC_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (role !== "SYSTEM_MANAGER" && session.user.clinicId && provider.clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = [
      "firstName", "lastName", "credentials", "bio", "qualifications",
      "photoUrl", "npiNumber", "yearsExperience", "slotDurationMinutes",
      "status", "videoVisitLink",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (updateData.status && !PROVIDER_STATUSES.includes(updateData.status as any)) {
      return NextResponse.json({ error: "Invalid provider status" }, { status: 400 });
    }

    const updated = await db.provider.update({
      where: { id },
      data: updateData,
      select: {
        id: true, firstName: true, lastName: true, credentials: true,
        slug: true, bio: true, qualifications: true, photoUrl: true,
        npiNumber: true, yearsExperience: true, slotDurationMinutes: true,
        status: true, videoVisitLink: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.PROVIDER_UPDATED,
      targetType: "PROVIDER",
      targetId: id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[STAFF_PROVIDER_UPDATE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
