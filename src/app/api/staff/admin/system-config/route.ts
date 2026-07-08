import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { cache, CacheKeys } from "@/lib/cache";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await cache.getOrSet(CacheKeys.systemConfig(), async () => {
      const data = await db.systemConfig.findUnique({ where: { id: "singleton" } });
      if (!data) {
        return {
          minDepositCents: 0,
          maxDepositCents: 50000,
          lockTtlSeconds: 600,
          slotGenerationWindowDays: 90,
          waitlistProcessingDelayMin: 3,
          zeroDepositRequireCard: false,
          platformFeeCents: 0,
          reviewWindowDays: 7,
        };
      }
      return data;
    }, 60);

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("[SYSTEM_CONFIG_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = [
      "minDepositCents", "maxDepositCents", "lockTtlSeconds",
      "slotGenerationWindowDays", "waitlistProcessingDelayMin",
      "zeroDepositRequireCard", "platformFeeCents", "reviewWindowDays",
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

    const minDepCents = body.minDepositCents;
    const maxDepCents = body.maxDepositCents;
    if (minDepCents !== undefined && maxDepCents !== undefined && minDepCents > maxDepCents) {
      return NextResponse.json({ error: "minDepositCents cannot exceed maxDepositCents" }, { status: 400 });
    }
    if (updateData.lockTtlSeconds !== undefined && (updateData.lockTtlSeconds as number) < 60) {
      return NextResponse.json({ error: "lockTtlSeconds must be at least 60" }, { status: 400 });
    }
    if (updateData.reviewWindowDays !== undefined && (updateData.reviewWindowDays as number) < 1) {
      return NextResponse.json({ error: "reviewWindowDays must be at least 1" }, { status: 400 });
    }

    const config = await db.systemConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...updateData } as Record<string, unknown>,
      update: updateData,
    });

    cache.deleteByPrefix(CacheKeys.systemConfig());

    createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.SYSTEM_CONFIG_UPDATED,
      targetType: "SYSTEM",
      targetId: "singleton",
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("[SYSTEM_CONFIG_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
