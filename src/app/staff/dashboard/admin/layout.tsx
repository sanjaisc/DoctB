"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Settings,
  Tags,
  Building2,
  CalendarCheck,
  ScrollText,
  BarChart3,
  Server,
} from "lucide-react";

const TABS = [
  { href: "/staff/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/staff/dashboard/admin/configuration", label: "Configuration", icon: Settings },
  { href: "/staff/dashboard/admin/taxonomies", label: "Taxonomies", icon: Tags },
  { href: "/staff/dashboard/admin/clinics", label: "Clinics", icon: Building2 },
  { href: "/staff/dashboard/admin/appointments", label: "Appointments", icon: CalendarCheck },
  { href: "/staff/dashboard/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/staff/dashboard/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/staff/dashboard/admin/infrastructure", label: "Infrastructure", icon: Server },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <nav className="flex gap-1 min-w-max border-b border-border pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.href === "/staff/dashboard/admin"
                ? pathname === tab.href
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 ${
                  isActive
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
