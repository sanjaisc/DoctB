import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.provider.findUnique({ where: { id }, select: { clinicId: true } });
    if (!existing) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const clinicId = session.user.clinicId;
    const role = session.user.role;
    if (role !== "SYSTEM_MANAGER" && clinicId && existing.clinicId !== clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { languageIds }: { languageIds: string[] } = await request.json();
    if (!Array.isArray(languageIds)) {
      return NextResponse.json({ error: "languageIds must be an array" }, { status: 400 });
    }

    await db.$transaction([
      db.providerLanguage.deleteMany({ where: { providerId: id } }),
      ...(languageIds.length > 0
        ? [db.providerLanguage.createMany({
            data: languageIds.map((languageId) => ({ providerId: id, languageId })),
          })]
        : []),
    ]);

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.PROVIDER_UPDATED, targetType: "PROVIDER", targetId: id });
    return NextResponse.json({ success: true, count: languageIds.length });
  } catch (error) {
    console.error("[STAFF_PROVIDER_LANGUAGES_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
