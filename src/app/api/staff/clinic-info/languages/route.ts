import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

// GET — return all global languages + clinic's selected ones
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

    const [allLanguages, providers] = await Promise.all([
      db.language.findMany({ orderBy: { sortOrder: "asc" } }),
      db.provider.findMany({
        where: { clinicId },
        select: {
          id: true,
          languages: { select: { languageId: true } },
        },
      }),
    ]);

    // Collect all language IDs used by this clinic's providers
    const selectedLanguageIds = new Set<string>();
    for (const provider of providers) {
      for (const pl of provider.languages) {
        selectedLanguageIds.add(pl.languageId);
      }
    }

    const selected = allLanguages.filter((l) => selectedLanguageIds.has(l.id));

    return NextResponse.json({ all: allLanguages, selected });
  } catch (error) {
    console.error("[CLINIC_LANGUAGES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — set clinic's languages (applied to all providers)
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

    const { languageIds }: { languageIds: string[] } = await request.json();
    if (!Array.isArray(languageIds)) {
      return NextResponse.json({ error: "languageIds must be an array" }, { status: 400 });
    }

    // Validate language IDs exist
    const existing = await db.language.findMany({
      where: { id: { in: languageIds } },
      select: { id: true },
    });
    const validIds = new Set(existing.map((l) => l.id));
    const validLanguageIds = languageIds.filter((id) => validIds.has(id));

    // Get all providers for this clinic
    const providers = await db.provider.findMany({
      where: { clinicId },
      select: { id: true },
    });

    // Replace language assignments for all providers
    await db.providerLanguage.deleteMany({
      where: { provider: { clinicId } },
    });

    for (const provider of providers) {
      if (validLanguageIds.length > 0) {
        await db.providerLanguage.createMany({
          data: validLanguageIds.map((languageId) => ({
            providerId: provider.id,
            languageId,
          })),
        });
      }
    }

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.CLINIC_UPDATED, targetType: "CLINIC", targetId: clinicId });
    return NextResponse.json({ success: true, count: validLanguageIds.length });
  } catch (error) {
    console.error("[CLINIC_LANGUAGES_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
