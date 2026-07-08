import { db } from "@/lib/db";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  return new Resend(RESEND_API_KEY);
}

const DEFAULT_FROM = "DoctA <notifications@docta.app>";

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
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

interface RenderOptions {
  patientName?: string;
  date?: string;
  time?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  manageUrl?: string;
  checkInUrl?: string;
  offerUrl?: string;
}

async function loadClinicData(clinicId: string) {
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: {
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      phoneNumber: true,
      commonInstructions: true,
      emailFromName: true,
      customEmailHeader: true,
    },
  });
  return clinic;
}

function renderTemplate(template: { subject: string; body: string }, vars: RenderOptions, commonInstructions: string): { subject: string; html: string } {
  const replace = (text: string) =>
    text
      .replace(/\{\{PATIENT_NAME\}\}/g, vars.patientName || "Patient")
      .replace(/\{\{DATE\}\}/g, vars.date || "")
      .replace(/\{\{TIME\}\}/g, vars.time || "")
      .replace(/\{\{CLINIC_NAME\}\}/g, vars.clinicName || "")
      .replace(/\{\{CLINIC_ADDRESS\}\}/g, vars.clinicAddress || "")
      .replace(/\{\{CLINIC_PHONE\}\}/g, vars.clinicPhone || "")
      .replace(/\{\{MANAGE_URL\}\}/g, vars.manageUrl || "")
      .replace(/\{\{CHECK_IN_URL\}\}/g, vars.checkInUrl || "")
      .replace(/\{\{OFFER_URL\}\}/g, vars.offerUrl || "")
      .replace(/\{\{COMMON_INSTRUCTIONS\}\}/g, commonInstructions);

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${replace(template.body)}
      <hr style="margin-top: 24px; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">
        This is an automated message from ${vars.clinicName || "DoctA"}.
      </p>
    </div>
  `;

  return { subject: replace(template.subject), html };
}

export async function sendAppointmentConfirmation(params: {
  clinicId: string;
  patientEmail: string;
  patientName: string;
  date: string;
  time: string;
  manageUrl: string;
}) {
  const { clinicId, patientEmail, patientName, date, time, manageUrl } = params;
  const clinic = await loadClinicData(clinicId);
  if (!clinic) return;

  const clinicAddress = `${clinic.streetAddress}, ${clinic.city}, ${clinic.state}`;

  // Load custom template from DB or use default
  const customTemplate = await db.emailTemplate.findUnique({
    where: { clinicId_templateKey: { clinicId, templateKey: "booking_confirmation" } },
  });
  const template = customTemplate || DEFAULT_TEMPLATES.booking_confirmation;

  const { subject, html } = renderTemplate(template, {
    patientName,
    date,
    time,
    clinicName: clinic.name,
    clinicAddress,
    clinicPhone: clinic.phoneNumber,
    manageUrl,
  }, clinic.commonInstructions || "");

  await sendRawEmail({
    to: patientEmail,
    subject,
    html,
    fromName: clinic.emailFromName || clinic.name,
  });
}

interface SendRawEmailParams {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

async function sendRawEmail({ to, subject, html, fromName }: SendRawEmailParams) {
  const resend = getResend();
  if (!resend) {
    console.log(`[EMAIL] No RESEND_API_KEY configured. Would send to ${to}: ${subject}`);
    return;
  }

  try {
    await resend.emails.send({
      from: fromName ? `${fromName} <${DEFAULT_FROM.match(/<(.+)>/)?.[1] || "notifications@docta.app"}>` : DEFAULT_FROM,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
  }
}
