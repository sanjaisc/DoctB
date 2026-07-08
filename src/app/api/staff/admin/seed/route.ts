import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { execSync } from "child_process";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    execSync("bunx prisma db seed", {
      timeout: 60_000,
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: "pipe",
    });

    return NextResponse.json({ seeded: true });
  } catch (error: any) {
    console.error("[SEED_RUN]", error);
    return NextResponse.json(
      { error: "Seed failed", detail: error.stderr?.toString() || error.message },
      { status: 500 }
    );
  }
}
