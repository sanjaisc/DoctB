"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Star,
  MapPin,
  Building2,
  Quote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistance } from "@/lib/geo";

interface ProviderCardProps {
  provider: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string;
    credentials: string | null;
    photoUrl: string | null;
    rating: number;
    reviewCount: number;
    slotDurationMinutes: number;
    clinic: {
      id: string;
      slug: string;
      name: string;
      streetAddress: string;
      city: string;
      state: string;
      zipCode: string;
      phoneNumber: string;
      logoUrl: string | null;
    };
    distance: number | null;
    earliestSlots: Array<{
      id: string;
      startTime: string;
      endTime: string;
      modality: string;
    }>;
    reviewSnippet: string | null;
    costBadge: string | null;
  };
  onSlotClick?: (providerId: string, slotId: string) => void;
}

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

export function ProviderCard({ provider, onSlotClick }: ProviderCardProps) {
  const router = useRouter();

  const initials = `${provider.firstName.charAt(0)}${provider.lastName.charAt(0)}`;
  const fullName = `${provider.firstName} ${provider.lastName}`;
  const displayName = provider.credentials
    ? `Dr. ${fullName}, ${provider.credentials}`
    : `Dr. ${fullName}`;

  const address = [
    provider.clinic.streetAddress,
    provider.clinic.city,
    provider.clinic.state,
    provider.clinic.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const handleSlotClick = (slotId: string) => {
    if (onSlotClick) {
      onSlotClick(provider.id, slotId);
    } else {
      router.push(`/book?providerId=${provider.id}&slotId=${slotId}`);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto transition-all duration-200 hover:shadow-md py-0 gap-0">
      <CardContent className="p-4 space-y-3">
        {/* Top row: Avatar + Info + Cost Badge */}
        <div className="flex gap-4">
          {/* Avatar */}
          <Avatar className="size-16 shrink-0 rounded-full bg-emerald-100">
            {provider.photoUrl && <AvatarImage src={provider.photoUrl} alt={displayName} />}
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-base font-semibold rounded-full">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Name + Cost Badge */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold leading-tight truncate">
                {displayName}
              </h3>
              {provider.costBadge && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-emerald-300 text-emerald-700 bg-emerald-50/50"
                >
                  {provider.costBadge}
                </Badge>
              )}
            </div>

            {/* Clinic */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate">{provider.clinic.name}</span>
            </div>

            {/* Address + Distance */}
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground mt-0.5">
              <MapPin className="size-3.5 shrink-0 mt-0.5" />
              <span className="truncate">
                {address}
                {provider.distance != null && (
                  <span className="font-medium text-emerald-600 ml-1">
                    · {formatDistance(provider.distance)}
                  </span>
                )}
              </span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-1">
              <RatingStars rating={provider.rating} />
              <span className="text-sm text-muted-foreground">
                {provider.rating.toFixed(1)} ({provider.reviewCount}{" "}
                {provider.reviewCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>
        </div>

        {/* Available Times */}
        {provider.earliestSlots.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">
                Available Times
              </h4>
              <div className="flex gap-2 flex-wrap">
                {provider.earliestSlots.map((slot) => (
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
        )}

        {/* Review Snippet */}
        {provider.reviewSnippet && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Quote className="size-4 shrink-0 text-muted-foreground/50 mt-0.5" />
              <p className="text-sm italic text-muted-foreground line-clamp-2">
                &ldquo;{provider.reviewSnippet}&rdquo;
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}