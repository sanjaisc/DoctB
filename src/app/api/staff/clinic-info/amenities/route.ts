import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

// GET — return all global amenities + clinic's selected ones
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

    const [allAmenities, clinicAmenities] = await Promise.all([
      db.amenity.findMany({ orderBy: { sortOrder: "asc" } }),
      db.clinicAmenity.findMany({
        where: { clinicId },
        select: { amenityId: true },
      }),
    ]);

    const selectedIds = new Set(clinicAmenities.map((ca) => ca.amenityId));
    const selected = allAmenities.filter((a) => selectedIds.has(a.id));

    return NextResponse.json({ all: allAmenities, selected });
  } catch (error) {
    console.error("[CLINIC_AMENITIES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — replace clinic's amenity set
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

    const { amenityIds }: { amenityIds: string[] } = await request.json();
    if (!Array.isArray(amenityIds)) {
      return NextResponse.json({ error: "amenityIds must be an array" }, { status: 400 });
    }

    // Validate amenity IDs exist
    const existing = await db.amenity.findMany({
      where: { id: { in: amenityIds } },
      select: { id: true },
    });
    const validIds = new Set(existing.map((a) => a.id));
    const validAmenityIds = amenityIds.filter((id) => validIds.has(id));

    // Replace all amenity assignments in a transaction
    await db.$transaction([
      db.clinicAmenity.deleteMany({ where: { clinicId } }),
      ...(validAmenityIds.length > 0
        ? [
            db.clinicAmenity.createMany({
              data: validAmenityIds.map((amenityId) => ({
                clinicId,
                amenityId,
              })),
            }),
          ]
        : []),
    ]);

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.CLINIC_UPDATED, targetType: "CLINIC", targetId: clinicId });
    return NextResponse.json({ success: true, count: validAmenityIds.length });
  } catch (error) {
    console.error("[CLINIC_AMENITIES_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
