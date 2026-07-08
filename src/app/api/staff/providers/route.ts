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
    const role = session.user.role;

    if (!clinicId) {
      return NextResponse.json({ error: "No clinic specified" }, { status: 400 });
    }

    if (role !== "SYSTEM_MANAGER" && session.user.clinicId && clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

    const providers = await db.provider.findMany({
      where: {
        clinicId,
        ...(includeInactive ? {} : { status: "ACTIVE" }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        credentials: true,
        slug: true,
        bio: true,
        qualifications: true,
        photoUrl: true,
        npiNumber: true,
        yearsExperience: true,
        slotDurationMinutes: true,
        status: true,
        videoVisitLink: true,
        _count: {
          select: {
            slotTemplates: true,
            appointments: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json({ data: providers });
  } catch (error) {
    console.error("[STAFF_PROVIDERS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = request.nextUrl.searchParams.get("clinicId") || session.user.clinicId;
    const role = session.user.role;

    if (!clinicId) {
      return NextResponse.json({ error: "No clinic specified" }, { status: 400 });
    }

    if (role !== "SYSTEM_MANAGER" && session.user.clinicId && clinicId !== session.user.clinicId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, credentials, npiNumber, bio, qualifications, yearsExperience, slotDurationMinutes, videoVisitLink } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    // Generate unique slug
    const baseSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`.replace(/[^a-z0-9-]/g, "");
    let slug = baseSlug;
    let counter = 1;
    while (await db.provider.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const provider = await db.provider.create({
      data: {
        clinicId,
        firstName,
        lastName,
        credentials: credentials || null,
        slug,
        npiNumber: npiNumber || null,
        bio: bio || null,
        qualifications: qualifications || null,
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
        slotDurationMinutes: slotDurationMinutes ? parseInt(slotDurationMinutes) : 30,
        videoVisitLink: videoVisitLink || null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        credentials: true,
        slug: true,
        status: true,
        slotDurationMinutes: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.PROVIDER_CREATED,
      targetType: "PROVIDER",
      targetId: provider.id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ data: provider }, { status: 201 });
  } catch (error) {
    console.error("[STAFF_PROVIDERS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
