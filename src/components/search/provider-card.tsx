"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Star,
  MapPin,
  Building2,
  Quote,
  Phone,
  Calendar,
  ChevronRight,
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
  index?: number;
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

export function ProviderCard({ provider, index = 0, onSlotClick }: ProviderCardProps) {
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

  const staggerDelay = Math.min(index * 80, 400);

  return (
    <Card
      className={`w-full max-w-3xl mx-auto transition-all duration-200 hover:scale-[1.005] hover:shadow-lg hover:border-l-4 hover:border-l-emerald-400 hover:bg-emerald-50/30 py-0 gap-0 animate-in fade-in-0 slide-in-from-bottom-2`}
      style={{ animationDelay: `${staggerDelay}ms`, animationFillMode: "both" }}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top row: Avatar + Info + Cost Badge */}
        <div className="flex gap-4">
          {/* Avatar with ring */}
          <Avatar className="size-16 shrink-0 rounded-full bg-emerald-100 ring-2 ring-emerald-200">
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
                  className="shrink-0 border-emerald-300 text-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50"
                >
                  {provider.costBadge}
                </Badge>
              )}
            </div>

            {/* Clinic name (clickable) + Phone icon */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              <Building2 className="size-3.5 shrink-0" />
              <Link
                href={`/clinic/${provider.clinic.slug}`}
                className="truncate hover:underline hover:text-emerald-700 transition-colors cursor-pointer"
              >
                {provider.clinic.name}
              </Link>
              <a
                href={`tel:${provider.clinic.phoneNumber}`}
                className="shrink-0 text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                title={`Call ${provider.clinic.name}`}
                aria-label={`Call ${provider.clinic.name} at ${provider.clinic.phoneNumber}`}
              >
                <Phone className="size-3.5" />
              </a>
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
                {provider.earliestSlots.map((slot) => {
                  const isVideo = slot.modality === "VIDEO";
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSlotClick(slot.id)}
                      className={`cursor-pointer inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 hover:shadow-sm animate-pulse-subtle
                        ${isVideo
                          ? "border-l-4 border-l-blue-400 border-border hover:bg-blue-50 hover:border-blue-300"
                          : "border-l-4 border-l-emerald-400 border-border hover:bg-emerald-50 hover:border-emerald-300"
                        }`}
                    >
                      <Calendar className="size-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-foreground">
                          {formatSlotTime(slot.startTime)}
                        </span>
                        <ModalityBadge modality={slot.modality} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Review Snippet */}
        {provider.reviewSnippet && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="flex gap-2">
                <Quote className="size-4 shrink-0 text-muted-foreground/50 mt-0.5" />
                <p className="text-sm italic text-muted-foreground line-clamp-2">
                  &ldquo;{provider.reviewSnippet}&rdquo;
                </p>
              </div>
              <Link
                href="#"
                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:underline transition-colors cursor-pointer pl-6"
              >
                Read more reviews
                <ChevronRight className="size-3" />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}