// =============================================================================
// Slot Generator API — POST /api/admin/slots/generate
// =============================================================================
// Generates bookable 30-minute slot instances from active SlotTemplates
// for the next 90 days. Idempotent — skips existing slots.
// Auth-gated: SYSTEM_MANAGER only.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { SLOT_STATUS } from "@/lib/enums";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { SLOT_GENERATION_WINDOW_DAYS, DEFAULT_SLOT_DURATION_MINUTES } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    // ---- Auth: SYSTEM_MANAGER only ----
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json(
        { error: "Forbidden: SYSTEM_MANAGER role required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // ---- Read all active slot templates ----
    const templates = await db.slotTemplate.findMany({
      where: { isActive: true },
      include: {
        provider: {
          select: { id: true, clinicId: true },
        },
      },
    });

    if (templates.length === 0) {
      return NextResponse.json({ generated: 0, skipped: 0, total: 0 });
    }

    // ---- Calculate date range ----
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + SLOT_GENERATION_WINDOW_DAYS);

    let generated = 0;
    let skipped = 0;
    const closureCache = new Map<string, Array<{ startDate: Date; endDate: Date }>>();

    // Helper: check if a date falls within any closure for a clinic
    async function isClosureDate(clinicId: string, date: Date): Promise<boolean> {
      if (!closureCache.has(clinicId)) {
        const closures = await db.clinicClosure.findMany({
          where: { clinicId, endDate: { gte: today } },
          select: { startDate: true, endDate: true },
        });
        closureCache.set(clinicId, closures);
      }
      const clinicClosures = closureCache.get(clinicId)!;
      const dateStr = date.toISOString().slice(0, 10);
      for (const c of clinicClosures) {
        const startStr = c.startDate.toISOString().slice(0, 10);
        const endStr = c.endDate.toISOString().slice(0, 10);
        if (dateStr >= startStr && dateStr <= endStr) return true;
      }
      return false;
    }

    // ---- Process each template ----
    for (const template of templates) {
      const clinicId = template.provider.clinicId;
      const providerId = template.providerId;

      // Iterate through each day in the window
      const currentDay = new Date(today);
      while (currentDay <= endDate) {
        // Check if this day matches the template's dayOfWeek
        // JS getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
        if (currentDay.getDay() === template.dayOfWeek) {
          // Skip if this date falls within a clinic closure
          if (await isClosureDate(clinicId, currentDay)) {
            currentDay.setDate(currentDay.getDate() + 1);
            continue;
          }

          // Parse startTime and endTime (HH:mm)
          const [startHour, startMin] = template.startTime.split(":").map(Number);
          const [endHour, endMin] = template.endTime.split(":").map(Number);

          // Generate 30-minute slots from start to end (exclusive of end)
          let slotStartMinutes = startHour * 60 + startMin;
          const slotEndMinutes = endHour * 60 + endMin;

          while (slotStartMinutes + DEFAULT_SLOT_DURATION_MINUTES <= slotEndMinutes) {
            const slotEndMin = slotStartMinutes + DEFAULT_SLOT_DURATION_MINUTES;
            const slotStartHour = Math.floor(slotStartMinutes / 60);
            const slotStartMinuteRem = slotStartMinutes % 60;
            const slotEndHour = Math.floor(slotEndMin / 60);
            const slotEndMinuteRem = slotEndMin % 60;

            // Build the actual UTC date-times
            const slotStartTime = new Date(currentDay);
            slotStartTime.setHours(slotStartHour, slotStartMinuteRem, 0, 0);

            const slotEndTime = new Date(currentDay);
            slotEndTime.setHours(slotEndHour, slotEndMinuteRem, 0, 0);

            // Check if a slot already exists (idempotent)
            const existingSlot = await db.slot.findUnique({
              where: {
                providerId_startTime: {
                  providerId,
                  startTime: slotStartTime,
                },
              },
            });

            if (existingSlot) {
              skipped++;
            } else {
              await db.slot.create({
                data: {
                  clinicId,
                  providerId,
                  startTime: slotStartTime,
                  endTime: slotEndTime,
                  modality: template.modality,
                  status: SLOT_STATUS.AVAILABLE,
                  templateId: template.id,
                },
              });
              generated++;
            }

            slotStartMinutes += DEFAULT_SLOT_DURATION_MINUTES;
          }
        }

        // Move to the next day
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }

    const total = generated + skipped;

    // ---- Invalidate caches ----
    cache.deleteByPrefix("slots:");
    cache.deleteByPrefix("search:");

    // ---- Audit log ----
    await createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.SLOT_GENERATED,
      targetType: "SLOT",
    });

    return NextResponse.json({ generated, skipped, total });
  } catch (error) {
    console.error("[SLOT_GENERATE] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while generating slots", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}