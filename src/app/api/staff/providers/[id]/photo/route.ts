import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(
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

    const body = await request.json();
    const { photoUrl } = body;

    if (!photoUrl || typeof photoUrl !== "string") {
      return NextResponse.json({ error: "photoUrl (base64 data URI) is required" }, { status: 400 });
    }

    // Validate size (rough check for base64)
    const base64Size = Math.round((photoUrl.length * 3) / 4);
    if (base64Size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image exceeds 5MB limit" }, { status: 400 });
    }

    // Validate it looks like a valid data URI
    if (!photoUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image format. Must be a data URI (data:image/...)" }, { status: 400 });
    }

    await db.provider.update({
      where: { id },
      data: { photoUrl },
    });

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.PROVIDER_UPDATED, targetType: "PROVIDER", targetId: id });
    return NextResponse.json({ success: true, photoUrl });
  } catch (error) {
    console.error("[STAFF_PROVIDER_PHOTO_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
