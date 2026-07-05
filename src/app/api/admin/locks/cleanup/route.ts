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

    // ---- Process each expired lock ----
    for (const lock of expiredLocks) {
      // Release the slot back to AVAILABLE if it's still LOCKED
      if (lock.slot.status === SLOT_STATUS.LOCKED) {
        await db.slot.update({
          where: { id: lock.slot.id },
          data: { status: SLOT_STATUS.AVAILABLE },
        });
      }

      // Create audit log for the expired lock
      await createAuditLog({
        userId: session.user.id,
        action: AUDIT_ACTIONS.SLOT_LOCK_EXPIRED,
        targetType: "SLOT_LOCK",
        targetId: lock.id,
      });

      // Delete the lock record
      await db.slotLock.delete({
        where: { id: lock.id },
      });

      cleaned++;
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