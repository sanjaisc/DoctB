// =============================================================================
// Lock Cleanup API — POST /api/admin/locks/cleanup
// =============================================================================
// Finds all expired SlotLock records, releases the associated slot back to
// AVAILABLE, deletes the lock, and creates an audit log entry.
// Simulates what a background cron job would do.
// Auth-gated: SYSTEM_MANAGER only.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { SLOT_STATUS } from "@/lib/enums";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

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

    const now = new Date();

    // ---- Find all expired locks ----
    const expiredLocks = await db.slotLock.findMany({
      where: {
        expiresAt: { lt: now },
      },
      include: {
        slot: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    let cleaned = 0;

    // ---- Process each expired lock in individual transactions ----
    // Each lock release is atomic to prevent race conditions
    for (const lock of expiredLocks) {
      try {
        await db.$transaction(async (tx) => {
          // Re-check slot status inside the transaction
          const slot = await tx.slot.findUnique({
            where: { id: lock.slot.id },
            select: { status: true },
          });

          if (slot && slot.status === SLOT_STATUS.LOCKED) {
            await tx.slot.update({
              where: { id: lock.slot.id },
              data: { status: SLOT_STATUS.AVAILABLE },
            });
          }

          // Delete the lock record
          await tx.slotLock.delete({
            where: { id: lock.id },
          });
        });

        // Audit log (outside transaction — fire-and-forget)
        createAuditLog({
          userId: session.user.id,
          action: AUDIT_ACTIONS.SLOT_LOCK_EXPIRED,
          targetType: "SLOT_LOCK",
          targetId: lock.id,
        });

        cleaned++;
      } catch (error) {
        // If one lock fails, log and continue with the rest
        console.error(`[LOCK_CLEANUP] Failed to release lock ${lock.id}:`, error);
      }
    }

    // ---- Invalidate caches ----
    cache.deleteByPrefix("slots:");
    cache.deleteByPrefix("search:");

    return NextResponse.json({ cleaned });
  } catch (error) {
    console.error("[LOCK_CLEANUP] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while cleaning up locks", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}