"use client";

import { Badge } from "@/components/ui/badge";
import {
  APP_STATUS_STYLES,
  SLOT_STATUS_STYLES,
  CLINIC_STATUS_STYLES,
  AUDIT_ACTION_STYLES,
  APP_STATUS_LABELS,
  SLOT_STATUS_LABELS,
  APPOINTMENT_STATUS,
  SLOT_STATUS,
  CLINIC_STATUS,
} from "@/lib/enums";

const CATEGORY_MAP: Record<string, Record<string, string>> = {
  app: APP_STATUS_STYLES,
  slot: SLOT_STATUS_STYLES,
  clinic: CLINIC_STATUS_STYLES,
  audit: AUDIT_ACTION_STYLES,
};

const LABEL_MAP: Record<string, Record<string, string>> = {
  app: APP_STATUS_LABELS,
  slot: SLOT_STATUS_LABELS,
};

interface StatusBadgeProps {
  status: string;
  category?: "app" | "slot" | "clinic" | "audit";
}

export function StatusBadge({ status, category = "app" }: StatusBadgeProps) {
  const colors = CATEGORY_MAP[category]?.[status] ?? "bg-muted text-muted-foreground border-muted";
  const label = LABEL_MAP[category]?.[status] ?? status.replace(/_/g, " ").toLowerCase();
  return (
    <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${colors}`}>
      {label}
    </Badge>
  );
}
