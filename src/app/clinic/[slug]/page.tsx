import { redirect } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Shield,
  Star,
  Building2,
  Heart,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ClinicProviderRow } from "@/components/clinic/clinic-provider-row";
import { db } from "@/lib/db";

// =============================================================================
// Types
// =============================================================================

interface DayHours {
  open: string;
  close: string;
}

type HoursOfWeek = Record<string, DayHours | null>;

// =============================================================================
// Helpers
// =============================================================================

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function formatTime24to12(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function renderHoursRow(dayKey: string, dayData: DayHours | null): string {
  const label = DAY_LABELS[dayKey] ?? dayKey;
  if (!dayData || !dayData.open || !dayData.close) {
    return `${label} — Closed`;
  }
  return `${label}  ${formatTime24to12(dayData.open)} – ${formatTime24to12(dayData.close)}`;
}

// =============================================================================
// Page Component
// =============================================================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClinicDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // ---------------------------------------------------------------------------
  // Fetch clinic with related data
  // ---------------------------------------------------------------------------
  const clinic = await db.clinic.findUnique({
    where: { slug },
    include: {
      insurances: {
        include: { insurance: true },
        orderBy: { insurance: { sortOrder: "asc" } },
      },
      amenities: {
        include: { amenity: true },
        orderBy: { amenity: { sortOrder: "asc" } },
      },
    },
  });

  // Redirect if not found or not PUBLISHED
  if (!clinic || clinic.status !== "PUBLISHED") {
    redirect("/?status=suspended");
  }

  // ---------------------------------------------------------------------------
  // Fetch all providers for this clinic with their 3 earliest AVAILABLE slots
  // ---------------------------------------------------------------------------
  const providers = await db.provider.findMany({
    where: {
      clinicId: clinic.id,
      status: "ACTIVE",
    },
    orderBy: [{ rating: "desc" }, { lastName: "asc" }],
    include: {
      slots: {
        where: {
          status: "AVAILABLE",
          startTime: { gte: new Date() },
        },
        orderBy: { startTime: "asc" },
        take: 3,
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Parse hours of operation
  // ---------------------------------------------------------------------------
  let hours: HoursOfWeek | null = null;
  if (clinic.hoursOfOperation) {
    try {
      hours = JSON.parse(clinic.hoursOfOperation) as HoursOfWeek;
    } catch {
      hours = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Build display values
  // ---------------------------------------------------------------------------
  const fullAddress = [
    clinic.streetAddress,
    clinic.city,
    clinic.state,
    clinic.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ===== Sticky Header (matches search page) ===== */}
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="size-6 text-emerald-600 fill-emerald-600" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              ClinicBook
            </span>
          </Link>
          <Button variant="outline" size="sm" className="cursor-pointer">
            Staff Login
          </Button>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="flex-1 w-full px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
            Back to Search
          </Link>

          {/* ===== Clinic Header Card ===== */}
          <Card className="overflow-hidden">
            <CardContent className="p-6 space-y-4">
              {/* Name + Tagline */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="size-6 text-emerald-600 shrink-0" />
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    {clinic.name}
                  </h1>
                </div>
                {clinic.tagline && (
                  <p className="text-muted-foreground text-base ml-8">
                    {clinic.tagline}
                  </p>
                )}
              </div>

              <Separator />

              {/* Contact info */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Address */}
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{fullAddress}</span>
                </div>

                {/* Phone */}
                {clinic.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-emerald-600 shrink-0" />
                    <a
                      href={`tel:${clinic.phoneNumber}`}
                      className="text-sm text-foreground hover:text-emerald-700 transition-colors"
                    >
                      {clinic.phoneNumber}
                    </a>
                  </div>
                )}

                {/* Email */}
                {clinic.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-emerald-600 shrink-0" />
                    <a
                      href={`mailto:${clinic.email}`}
                      className="text-sm text-foreground hover:text-emerald-700 transition-colors"
                    >
                      {clinic.email}
                    </a>
                  </div>
                )}

                {/* Website */}
                {clinic.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-emerald-600 shrink-0" />
                    <a
                      href={clinic.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground hover:text-emerald-700 transition-colors truncate"
                    >
                      {clinic.website
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ===== About Section ===== */}
          {clinic.about && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="size-5 text-emerald-600" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {clinic.about}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ===== Hours of Operation ===== */}
          {hours && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="size-5 text-emerald-600" />
                  Hours of Operation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dayKeys.map((dayKey) => {
                    const dayData = hours[dayKey];
                    const isClosed = !dayData || !dayData.open || !dayData.close;
                    return (
                      <div
                        key={dayKey}
                        className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-b-0"
                      >
                        <span className="font-medium text-foreground min-w-[90px]">
                          {DAY_LABELS[dayKey]}
                        </span>
                        <span
                          className={
                            isClosed
                              ? "text-muted-foreground italic"
                              : "text-foreground"
                          }
                        >
                          {isClosed
                            ? "Closed"
                            : `${formatTime24to12(dayData.open)} – ${formatTime24to12(dayData.close)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== Insurance & Amenities (side by side on desktop) ===== */}
          {(clinic.insurances.length > 0 || clinic.amenities.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Insurance Accepted */}
              {clinic.insurances.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="size-5 text-emerald-600" />
                      Insurance Accepted
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {clinic.insurances.map((ci) => (
                        <Badge
                          key={ci.insuranceId}
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 bg-emerald-50/50"
                        >
                          {ci.insurance.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Amenities */}
              {clinic.amenities.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="size-5 text-emerald-600" />
                      Amenities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {clinic.amenities.map((ca) => (
                        <Badge
                          key={ca.amenityId}
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 bg-emerald-50/50"
                        >
                          {ca.amenity.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ===== Providers Section ===== */}
          {providers.length > 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Our Providers
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {providers.length}{" "}
                  {providers.length === 1 ? "provider" : "providers"} at{" "}
                  {clinic.name}
                </p>
              </div>

              <div className="space-y-4">
                {providers.map((provider) => (
                  <ClinicProviderRow
                    key={provider.id}
                    provider={{
                      id: provider.id,
                      firstName: provider.firstName,
                      lastName: provider.lastName,
                      credentials: provider.credentials,
                      rating: provider.rating,
                      reviewCount: provider.reviewCount,
                      slug: provider.slug,
                      slotDurationMinutes: provider.slotDurationMinutes,
                    }}
                    slots={provider.slots.map((slot) => ({
                      id: slot.id,
                      startTime: slot.startTime.toISOString(),
                      endTime: slot.endTime.toISOString(),
                      modality: slot.modality,
                    }))}
                    clinicSlug={clinic.slug}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== Footer (matches search page style) ===== */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} ClinicBook. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link
              href="/"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}