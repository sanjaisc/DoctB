"use client";

import { type LucideIcon } from "lucide-react";
import { TableCell } from "@/components/ui/table";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  colSpan?: number;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  colSpan,
  compact,
}: EmptyStateProps) {
  const content = (
    <div
      className={`flex flex-col items-center justify-center ${
        compact ? "py-8" : "py-16"
      } text-center`}
    >
      {Icon && (
        <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <Icon className="size-5 text-muted-foreground/60" />
        </div>
      )}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );

  if (colSpan) {
    return <TableCell colSpan={colSpan}>{content}</TableCell>;
  }

  return content;
}
