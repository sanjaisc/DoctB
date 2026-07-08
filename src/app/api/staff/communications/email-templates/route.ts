import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

const DEFAULT_TEMPLATES = {
  booking_confirmation: {
    subject: "Appointment Confirmed at {{CLINIC_NAME}}",
    body: `<p>Dear {{PATIENT_NAME}},</p><p>Your appointment has been confirmed.</p><p><strong>Date:</strong> {{DATE}}<br/><strong>Time:</strong> {{TIME}}<br/><strong>Location:</strong> {{CLINIC_NAME}}<br/><strong>Address:</strong> {{CLINIC_ADDRESS}}<br/><strong>Phone:</strong> {{CLINIC_PHONE}}</p><p>{{COMMON_INSTRUCTIONS}}</p><p>Manage your appointment: {{MANAGE_URL}}</p>`,
  },
  check_in_reminder: {
    subject: "Reminder: Upcoming Appointment at {{CLINIC_NAME}}",
    body: `<p>Dear {{PATIENT_NAME}},</p><p>This is a reminder of your upcoming appointment.</p><p><strong>Date:</strong> {{DATE}}<br/><strong>Time:</strong> {{TIME}}<br/><strong>Location:</strong> {{CLINIC_NAME}}<br/><strong>Address:</strong> {{CLINIC_ADDRESS}}</p><p>{{COMMON_INSTRUCTIONS}}</p><p>Check in online: {{CHECK_IN_URL}}</p>`,
  },
  waitlist_offer: {
    subject: "Appointment Slot Available at {{CLINIC_NAME}}",
    body: `<p>Dear {{PATIENT_NAME}},</p><p>A slot has become available for your waitlisted service.</p><p><strong>Date:</strong> {{DATE}}<br/><strong>Time:</strong> {{TIME}}</p><p>This offer expires soon. Click below to claim it.</p><p>{{OFFER_URL}}</p>`,
  },
};

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

    // Load custom templates from DB
    const customTemplates = await db.emailTemplate.findMany({
      where: { clinicId },
    });

    // Merge: DB overrides override defaults
    const templates = { ...DEFAULT_TEMPLATES };
    for (const ct of customTemplates) {
      if (templates[ct.templateKey]) {
        templates[ct.templateKey] = { subject: ct.subject, body: ct.body };
      }
    }

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { emailFromName: true, customEmailHeader: true, intakeReminderDays: true },
    });

    return NextResponse.json({
      templates,
      emailFromName: clinic?.emailFromName || null,
      customEmailHeader: clinic?.customEmailHeader || null,
      intakeReminderDays: clinic?.intakeReminderDays || "3,1",
    });
  } catch (error) {
    console.error("[EMAIL_TEMPLATES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { emailFromName, customEmailHeader, intakeReminderDays, templates } = body;

    // Update clinic-level settings
    const updateData: Record<string, unknown> = {};
    if (emailFromName !== undefined) updateData.emailFromName = emailFromName;
    if (customEmailHeader !== undefined) updateData.customEmailHeader = customEmailHeader;
    if (intakeReminderDays !== undefined) updateData.intakeReminderDays = intakeReminderDays;
    if (Object.keys(updateData).length > 0) {
      await db.clinic.update({ where: { id: clinicId }, data: updateData });
    }

    // Save template overrides
    if (templates && typeof templates === "object") {
      for (const [key, tpl] of Object.entries(templates)) {
        const t = tpl as { subject: string; body: string };
        await db.emailTemplate.upsert({
          where: { clinicId_templateKey: { clinicId, templateKey: key } },
          update: { subject: t.subject, body: t.body },
          create: { clinicId, templateKey: key, subject: t.subject, body: t.body },
        });
      }
    }

    createAuditLog({ userId: session.user.id, action: AUDIT_ACTIONS.EMAIL_TEMPLATES_UPDATED, targetType: "CLINIC", targetId: clinicId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EMAIL_TEMPLATES_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
