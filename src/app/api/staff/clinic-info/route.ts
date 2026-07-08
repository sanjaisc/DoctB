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
      select: {
        id: true, name: true, slug: true, tagline: true, description: true,
        about: true, phoneNumber: true, email: true, website: true,
        streetAddress: true, city: true, state: true, zipCode: true,
        latitude: true, longitude: true, logoUrl: true, coverImageUrl: true,
        galleryUrls: true, hoursOfOperation: true, faq: true,
        commonInstructions: true, status: true,
        inPersonDepositCents: true, videoDepositCents: true,
        selfPayFlatRateCents: true,
        inPersonCancellationLeadTimeMin: true, videoCancellationLeadTimeMin: true,
        reschedulePolicy: true,
        emailFromName: true, customEmailHeader: true, intakeReminderDays: true,
        mapEmbedUrl: true,
      },
    });

    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    return NextResponse.json(clinic);
  } catch (error) {
    console.error("[CLINIC_INFO_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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

    // Build update data — only include fields that are present
    const allowedFields = [
      "name", "tagline", "about", "description",
      "phoneNumber", "email", "website",
      "streetAddress", "city", "state", "zipCode", "latitude", "longitude",
      "logoUrl", "coverImageUrl", "galleryUrls",
      "hoursOfOperation", "faq", "commonInstructions",
      "inPersonDepositCents", "videoDepositCents",
      "selfPayFlatRateCents",
      "inPersonCancellationLeadTimeMin", "videoCancellationLeadTimeMin",
      "reschedulePolicy",
      "emailFromName", "customEmailHeader", "intakeReminderDays",
      "mapEmbedUrl",
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

    const updated = await db.clinic.update({
      where: { id: clinicId },
      data: updateData,
      select: {
        id: true, name: true, slug: true, tagline: true, about: true,
        phoneNumber: true, email: true, website: true,
        streetAddress: true, city: true, state: true, zipCode: true,
        logoUrl: true, coverImageUrl: true, galleryUrls: true,
        hoursOfOperation: true, faq: true, commonInstructions: true,
        inPersonDepositCents: true, videoDepositCents: true,
        selfPayFlatRateCents: true,
        inPersonCancellationLeadTimeMin: true, videoCancellationLeadTimeMin: true,
        reschedulePolicy: true,
        emailFromName: true, customEmailHeader: true, intakeReminderDays: true,
        mapEmbedUrl: true,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.CLINIC_UPDATED,
      targetType: "CLINIC",
      targetId: clinicId,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[CLINIC_INFO_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
