"use client";

import { TrendingUp, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  gradient: string;
  iconBg: string;
  trend?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  iconBg,
  trend,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/50 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300">
      <div className={`absolute inset-x-0 top-0 h-1 ${gradient}`} />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/40 to-transparent pointer-events-none" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs font-medium">
                <TrendingUp className="size-3 text-emerald-600" />
                <span className="text-emerald-600">{trend}</span>
              </div>
            )}
          </div>
          <div className={`size-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
