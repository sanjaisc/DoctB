import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SYSTEM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const providers = await db.provider.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        credentials: true,
        slug: true,
        status: true,
        clinicId: true,
        clinic: { select: { id: true, name: true, slug: true } },
        _count: { select: { providerServices: true, appointments: true } },
      },
      orderBy: [{ clinic: { name: "asc" } }, { firstName: "asc" }],
    });

    const data = providers.map((p) => ({
      id: p.id,
      name: `Dr. ${p.firstName} ${p.lastName}${p.credentials ? `, ${p.credentials}` : ""}`,
      slug: p.slug,
      status: p.status,
      clinicId: p.clinicId,
      clinicName: p.clinic.name,
      clinicSlug: p.clinic.slug,
      serviceCount: p._count.providerServices,
      appointmentCount: p._count.appointments,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[ADMIN_PROVIDERS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
