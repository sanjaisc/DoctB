import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
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

    const users = await db.user.findMany({
      where: { clinicId },
      select: {
        id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("[STAFF_STAFF_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only CLINIC_ADMIN or SYSTEM_MANAGER can invite staff
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
    const { email, name, role } = body;

    if (!email || !name || !role) {
      return NextResponse.json({ error: "email, name, and role are required" }, { status: 400 });
    }

    const creatorRole = session.user.role;
    const allowedRoles = creatorRole === "SYSTEM_MANAGER"
      ? ["SYSTEM_MANAGER", "CLINIC_ADMIN", "CLINIC_RECEPTION"]
      : ["CLINIC_ADMIN", "CLINIC_RECEPTION"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    // Generate a temporary password using random bytes
    const tempPassword = Array.from({ length: 12 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789".charAt(Math.floor(Math.random() * 56))
    ).join("");

    const passwordHash = await hashPassword(tempPassword);

    const targetClinicId = role === "SYSTEM_MANAGER" ? null : clinicId;

    const user = await db.user.create({
      data: { email, name, role, clinicId: targetClinicId, passwordHash, mustChangePassword: true },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, mustChangePassword: true },
    });

    const inviteUrl = `${request.nextUrl.origin}/staff/login?email=${encodeURIComponent(email)}`;

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.STAFF_INVITED, targetType: "STAFF", targetId: user.id });
    return NextResponse.json({ data: user, tempPassword, inviteUrl }, { status: 201 });
  } catch (error) {
    console.error("[STAFF_STAFF_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
