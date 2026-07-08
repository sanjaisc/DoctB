import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cache } from "@/lib/cache";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const before = cache.size;
    cache.clear();
    const after = cache.size;

    return NextResponse.json({ purged: true, entriesRemoved: before - after, remaining: after });
  } catch (error) {
    console.error("[CACHE_PURGE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
