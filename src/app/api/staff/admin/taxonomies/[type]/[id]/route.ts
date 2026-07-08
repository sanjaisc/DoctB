import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { AUDIT_MAP } from "../../route";

const TAXONOMY_TYPES = ["specialty", "service", "insurance", "amenity", "language"] as const;
type RouteType = (typeof TAXONOMY_TYPES)[number];

function isValidType(v: string): v is RouteType {
  return TAXONOMY_TYPES.includes(v as RouteType);
}

function prismaDelegate(type: RouteType) {
  switch (type) {
    case "specialty": return db.specialty;
    case "service": return db.service;
    case "insurance": return db.insurance;
    case "amenity": return db.amenity;
    case "language": return db.language;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { type, id } = await params;
    if (!isValidType(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const delegate = prismaDelegate(type) as any;
    const existing = await delegate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields: Record<RouteType, string[]> = {
      specialty: ["name", "slug", "description", "icon", "isActive", "sortOrder"],
      service: ["name", "slug", "description", "specialtyId", "durationMinutes", "selfPayPriceCents", "selfPayPaymentType", "isActive", "isBookable", "sortOrder"],
      insurance: ["name", "slug", "isActive", "isDemo", "sortOrder"],
      amenity: ["name", "slug", "icon", "sortOrder"],
      language: ["name", "code", "sortOrder"],
    };

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields[type]) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await delegate.update({ where: { id }, data: updateData });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_MAP[type].updated,
      targetType: type.toUpperCase(),
      targetId: id,
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Duplicate entry" }, { status: 409 });
    }
    console.error("[TAXONOMY_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { type, id } = await params;
    if (!isValidType(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const delegate = prismaDelegate(type) as any;
    const existing = await delegate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Soft delete for types with isActive, hard delete for amenity/language
    if (type === "amenity" || type === "language") {
      await delegate.delete({ where: { id } });
    } else {
      await delegate.update({ where: { id }, data: { isActive: false } });
    }

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_MAP[type].archived,
      targetType: type.toUpperCase(),
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TAXONOMY_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
