import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

const TAXONOMY_TYPES = ["specialty", "service", "insurance", "amenity", "language"] as const;
export type TaxonomyType = (typeof TAXONOMY_TYPES)[number];

export const AUDIT_MAP: Record<TaxonomyType, { created: string; updated: string; archived: string }> = {
  specialty: { created: "SPECIALTY_CREATED", updated: "SPECIALTY_UPDATED", archived: "SPECIALTY_ARCHIVED" },
  service: { created: "SERVICE_CREATED", updated: "SERVICE_UPDATED", archived: "SERVICE_ARCHIVED" },
  insurance: { created: "INSURANCE_CREATED", updated: "INSURANCE_UPDATED", archived: "INSURANCE_ARCHIVED" },
  amenity: { created: "AMENITY_CREATED", updated: "AMENITY_UPDATED", archived: "AMENITY_ARCHIVED" },
  language: { created: "LANGUAGE_CREATED", updated: "LANGUAGE_UPDATED", archived: "LANGUAGE_ARCHIVED" },
};

function isValidType(value: string): value is TaxonomyType {
  return TAXONOMY_TYPES.includes(value as TaxonomyType);
}

function prismaDelegate(type: TaxonomyType) {
  switch (type) {
    case "specialty": return db.specialty;
    case "service": return db.service;
    case "insurance": return db.insurance;
    case "amenity": return db.amenity;
    case "language": return db.language;
  }
}

function createSlug(name: string, slug?: string): string {
  return slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const type = request.nextUrl.searchParams.get("type");
    if (!type || !isValidType(type)) {
      return NextResponse.json({ error: `Invalid type. Use: ${TAXONOMY_TYPES.join(", ")}` }, { status: 400 });
    }
    const delegate = prismaDelegate(type);
    const items = await (delegate as any).findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("[TAXONOMIES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const type = request.nextUrl.searchParams.get("type");
    if (!type || !isValidType(type)) {
      return NextResponse.json({ error: `Invalid type. Use: ${TAXONOMY_TYPES.join(", ")}` }, { status: 400 });
    }
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const slug = createSlug(body.name, body.slug);

    const delegate = prismaDelegate(type) as any;
    const data: Record<string, unknown> = { name: body.name, slug };

    switch (type) {
      case "specialty":
        data.description = body.description;
        data.icon = body.icon;
        data.isActive = body.isActive ?? true;
        data.sortOrder = body.sortOrder ?? 0;
        break;
      case "service":
        data.specialtyId = body.specialtyId;
        data.description = body.description;
        data.durationMinutes = body.durationMinutes ?? 30;
        data.selfPayPriceCents = body.selfPayPriceCents ?? 0;
        data.selfPayPaymentType = body.selfPayPaymentType ?? "STANDARD_DEPOSIT";
        data.isActive = body.isActive ?? true;
        data.isBookable = body.isBookable ?? true;
        data.sortOrder = body.sortOrder ?? 0;
        break;
      case "insurance":
        data.isActive = body.isActive ?? true;
        data.isDemo = body.isDemo ?? false;
        data.sortOrder = body.sortOrder ?? 0;
        break;
      case "amenity":
        data.icon = body.icon;
        data.sortOrder = body.sortOrder ?? 0;
        break;
      case "language":
        data.code = body.code;
        data.sortOrder = body.sortOrder ?? 0;
        break;
    }

    const item = await delegate.create({ data });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_MAP[type].created,
      targetType: type.toUpperCase(),
      targetId: item.id,
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Duplicate entry. That name or slug already exists." }, { status: 409 });
    }
    console.error("[TAXONOMIES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
