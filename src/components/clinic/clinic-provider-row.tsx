"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Star, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ProviderSlot {
  id: string;
  startTime: string;
  endTime: string;
  modality: string;
}

interface ProviderData {
  id: string;
  firstName: string;
  lastName: string;
  credentials: string | null;
  rating: number;
  reviewCount: number;
  slug: string;
  slotDurationMinutes: number;
}

export interface ClinicProviderRowProps {
  provider: ProviderData;
  slots: ProviderSlot[];
  clinicSlug: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function RatingStars({ rating }: { rating: number }) {
  const filledCount = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i < filledCount
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function formatSlotTime(startTime: string): string {
  return format(new Date(startTime), "EEE, MMM d · h:mm a");
}

function ModalityBadge({ modality }: { modality: string }) {
  const isVideo = modality === "VIDEO";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
        isVideo
          ? "bg-blue-100 text-blue-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {isVideo ? "Video" : "In-Clinic"}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ClinicProviderRow({
  provider,
  slots,
  clinicSlug,
}: ClinicProviderRowProps) {
  const router = useRouter();

  const fullName = `${provider.firstName} ${provider.lastName}`;
  const displayName = provider.credentials
    ? `Dr. ${fullName}, ${provider.credentials}`
    : `Dr. ${fullName}`;

  const handleSlotClick = (slotId: string) => {
    router.push(`/book?providerId=${provider.id}&slotId=${slotId}`);
  };

  const firstSlotId = slots.length > 0 ? slots[0].id : null;

  return (
    <Card className="w-full transition-all duration-200 hover:shadow-md py-0 gap-0">
      <CardContent className="p-4 space-y-3">
        {/* Provider info row */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            {/* Provider name as link */}
            {firstSlotId ? (
              <Link
                href={`/book?providerId=${provider.id}&slotId=${firstSlotId}`}
                className="text-lg font-semibold leading-tight text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
              >
                {displayName}
              </Link>
            ) : (
              <span className="text-lg font-semibold leading-tight text-foreground">
                {displayName}
              </span>
            )}

            {/* Rating */}
            <div className="flex items-center gap-2">
              <RatingStars rating={provider.rating} />
              <span className="text-sm text-muted-foreground">
                {provider.rating.toFixed(1)} ({provider.reviewCount}{" "}
                {provider.reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>

          {/* Slot duration badge */}
          <Badge
            variant="outline"
            className="shrink-0 border-emerald-300 text-emerald-700 bg-emerald-50/50"
          >
            {provider.slotDurationMinutes} min
          </Badge>
        </div>

        {/* Slots */}
        {slots.length > 0 ? (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">
                Available Times
              </h4>
              <div className="flex gap-2 flex-wrap">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleSlotClick(slot.id)}
                    className="cursor-pointer inline-flex flex-col items-start gap-1 rounded-lg border border-border px-3 py-2 text-sm transition-all duration-200 hover:bg-emerald-50 hover:border-emerald-300"
                  >
                    <span className="text-foreground">
                      {formatSlotTime(slot.startTime)}
                    </span>
                    <ModalityBadge modality={slot.modality} />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <Separator />
            <p className="text-sm text-muted-foreground italic">
              No upcoming availability
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}