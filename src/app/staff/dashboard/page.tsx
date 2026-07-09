"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Building2,
  Activity,
  Shield,
  Phone,
  Video,
  UserCheck,
  BarChart3,
  CheckCheck,
  Bell,
  UserX,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/staff/stat-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import type { DoctASessionUser } from "@/lib/auth";
import { AUDIT_ACTIONS } from "@/lib/constants";

interface DashboardStats {
  todayAppointments: number;
  totalSlotsToday: number;
  availableSlotsToday: number;
  bookedToday: number;
  utilizationPercent: number;
  upcomingCount: number;
  totalBookings: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
}

interface TodayAppointment {
  id: string;
  startTime: string;
  status: string;
  patientName: string;
  patientPhone: string;
  modality: string;
  provider: { firstName: string; lastName: string; credentials: string | null };
  service: { name: string };
}

interface DashboardData {
  clinic: { id: string; name: string; slug: string; phoneNumber: string; status: string } | null;
  today: string;
  stats: DashboardStats;
  todayAppointments: TodayAppointment[];
  upcomingAppointments: TodayAppointment[];
  recentAppointments: TodayAppointment[];
}

function AppointmentRow({
  apt,
  compact,
}: {
  apt: TodayAppointment;
  compact?: boolean;
}) {
  const time = format(new Date(apt.startTime), "h:mm a");
  const providerName = `Dr. ${apt.provider.firstName} ${apt.provider.lastName}`;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group ${
        compact ? "" : "border border-border/30"
      }`}
    >
      <div className="text-center shrink-0 w-14">
        <p className="text-sm font-semibold text-foreground">{time}</p>
      </div>
      <div className="w-px h-10 bg-border/50 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {apt.patientName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {providerName}
          </span>
          <span className="text-border">·</span>
          <span className="text-xs text-muted-foreground truncate">
            {apt.service.name}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className={`text-[10px] px-2 py-0.5 ${
            apt.modality === "VIDEO"
              ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
              : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {apt.modality === "VIDEO" ? (
            <Video className="size-2.5 mr-1" />
          ) : (
            <Building2 className="size-2.5 mr-1" />
          )}
          {apt.modality === "VIDEO" ? "Video" : "In-Clinic"}
        </Badge>
        <Badge
          variant="outline"
          className={`text-[10px] px-2 py-0.5 ${
            apt.status === "CHECKED_IN"
              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              : "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
          }`}
        >
          {apt.status === "CHECKED_IN" ? (
            <UserCheck className="size-2.5 mr-1" />
          ) : (
            <Clock className="size-2.5 mr-1" />
          )}
          {apt.status === "CHECKED_IN" ? "Checked In" : "Booked"}
        </Badge>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{description}</p>
    </div>
  );
}

// ---- Recent Activity ----

interface ActivityNotification {
  id: string;
  action: string;
  createdAt: string;
  patientName: string | null;
  providerName: string | null;
  serviceName: string | null;
}

const ACTIVITY_ICON_MAP: Record<string, { icon: React.ElementType; color: string; bg: string; borderColor: string }> = {
  [AUDIT_ACTIONS.BOOKING_CREATED]: { icon: CalendarPlus, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", borderColor: "border-l-emerald-500" },
  [AUDIT_ACTIONS.BOOKING_CANCELLED]: { icon: XCircle, color: "text-red-500 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", borderColor: "border-l-red-500" },
  [AUDIT_ACTIONS.BOOKING_CHECKED_IN]: { icon: CheckCircle, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", borderColor: "border-l-blue-500" },
  [AUDIT_ACTIONS.BOOKING_COMPLETED]: { icon: CheckCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", borderColor: "border-l-green-500" },
  [AUDIT_ACTIONS.BOOKING_NO_SHOW]: { icon: UserX, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30", borderColor: "border-l-amber-500" },
};

function getActivityDescription(n: ActivityNotification): string {
  const patient = n.patientName ?? "Patient";
  switch (n.action) {
    case AUDIT_ACTIONS.BOOKING_CREATED:
      return `New booking for ${patient}`;
    case AUDIT_ACTIONS.BOOKING_CANCELLED:
      return `Booking cancelled for ${patient}`;
    case AUDIT_ACTIONS.BOOKING_CHECKED_IN:
      return `${patient} checked in`;
    case AUDIT_ACTIONS.BOOKING_COMPLETED:
      return `${patient}'s appointment completed`;
    case AUDIT_ACTIONS.BOOKING_NO_SHOW:
      return `${patient} did not show up`;
    default:
      return n.action;
  }
}

function RecentActivitySection({ clinicId }: { clinicId: string | null }) {
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    fetch(`/api/staff/notifications?clinicId=${clinicId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setNotifications(json.notifications.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clinicId]);

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      {/* Subtle gradient header strip */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Bell className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription className="text-xs">
                Latest booking events
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <Bell className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => {
              const cfg = ACTIVITY_ICON_MAP[n.action];
              const Icon = cfg?.icon ?? Bell;
              return (
                <div
                  key={n.id}
                  className={`
                    flex items-center gap-3 p-2.5 rounded-lg border-l-2
                    hover:bg-muted/50 transition-colors duration-150
                    ${cfg?.borderColor ?? "border-l-muted-foreground/30"}
                  `}
                >
                  <div
                    className={`size-7 rounded-md flex items-center justify-center shrink-0 ${
                      cfg?.bg ?? "bg-muted"
                    }`}
                  >
                    <Icon className={`size-3.5 ${cfg?.color ?? "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {getActivityDescription(n)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {n.providerName && <span>{n.providerName}</span>}
                      {n.providerName && n.serviceName && <span> &middot; </span>}
                      {n.serviceName && <span>{n.serviceName}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              );
            })}
            <Link
              href="/staff/dashboard/activity"
              className="w-full flex items-center justify-center gap-1 pt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              View all
              <ArrowRight className="size-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = session?.user as DoctASessionUser | undefined;

  const fetchDashboard = useCallback(async () => {
    if (!user?.clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/dashboard?clinicId=${user.clinicId}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.clinicId]);

  useEffect(() => {
    if (status === "authenticated") fetchDashboard();
  }, [status, fetchDashboard]);

  if (status === "loading" || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="size-8 text-red-400 dark:text-red-300 mb-3" />
          <p className="text-sm font-medium text-red-800 dark:text-red-200">Failed to load dashboard</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={fetchDashboard}
          >
            <RefreshCw className="size-3.5 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    // System Manager has no clinicId — dashboard data never loads.
    // Show a helpful redirect instead of a blank page.
    return (
      <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Shield className="size-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-center max-w-sm">
            <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
              No Clinic Assigned
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This dashboard is clinic-specific. You are logged in as a System&nbsp;Manager
              with no clinic attached. Use the&nbsp;<strong>Admin</strong> panel for
              cross-clinic management.
            </p>
          </div>
          <Button asChild className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/staff/dashboard/admin">
              Go to System Admin
              <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Activity className="size-3.5" />
            {data.today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className=""
            onClick={() => router.push("/staff/dashboard/calendar")}
          >
            <CalendarDays className="size-3.5 mr-2" />
            Calendar
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 dark:shadow-emerald-500/20"
            onClick={() => router.push("/staff/dashboard/book")}
          >
            <CalendarPlus className="size-3.5 mr-2" />
            Manual Booking
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Appointments"
          value={data.stats.todayAppointments}
          subtitle={`${data.stats.bookedToday} of ${data.stats.totalSlotsToday} slots filled`}
          icon={CalendarDays}
          gradient="bg-gradient-to-r from-emerald-500 to-teal-500"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          trend={`${data.stats.utilizationPercent}% utilization`}
        />
        <StatCard
          title="Checked In"
          value={data.todayAppointments.filter(a => a.status === "CHECKED_IN").length}
          subtitle="Currently waiting"
          icon={UserCheck}
          gradient="bg-gradient-to-r from-blue-500 to-indigo-500"
          iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="Upcoming"
          value={data.stats.upcomingCount}
          subtitle="Appointments in next 7 days"
          icon={Clock}
          gradient="bg-gradient-to-r from-amber-500 to-orange-500"
          iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          title="Total Bookings"
          value={data.stats.totalBookings}
          subtitle={`${data.stats.completedCount} completed · ${data.stats.cancelledCount} cancelled · ${data.stats.noShowCount} no-shows`}
          icon={BarChart3}
          gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-emerald-200/30 dark:from-emerald-800/30 via-emerald-200/50 dark:via-emerald-800/50 to-transparent" />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's schedule — takes 2 columns */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
                    {data.stats.upcomingCount > 0 && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {data.stats.todayAppointments} appointment{data.stats.todayAppointments !== 1 ? "s" : ""} today
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => router.push("/staff/dashboard/appointments")}
              >
                View all
                <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : data.todayAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No appointments today"
                description="Your schedule is clear. Use Manual Booking to add one."
              />
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar">
                {data.todayAppointments.map((apt) => (
                  <AppointmentRow key={apt.id} apt={apt} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions + summary */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              <button
                onClick={() => router.push("/staff/dashboard/book")}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-800/60 transition-all text-left cursor-pointer group"
              >
                <div className="size-9 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarPlus className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-50">New Booking</p>
                  <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">Book for a phone-in patient</p>
                </div>
                <ArrowRight className="size-4 text-emerald-400 dark:text-emerald-300 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </button>

              <button
                onClick={() => router.push("/staff/dashboard/calendar")}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200/60 dark:border-blue-800/60 transition-all text-left cursor-pointer group"
              >
                <div className="size-9 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarDays className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-50">View Calendar</p>
                  <p className="text-xs text-blue-700/70 dark:text-blue-300/70">See daily schedule grid</p>
                </div>
                <ArrowRight className="size-4 text-blue-400 dark:text-blue-300 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </button>

              <button
                onClick={() => router.push("/staff/dashboard/slots")}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200/60 dark:border-amber-800/60 transition-all text-left cursor-pointer group"
              >
                <div className="size-9 rounded-lg bg-amber-600 dark:bg-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Clock className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-50">Manage Slots</p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-300/70">Block or free time slots</p>
                </div>
                <ArrowRight className="size-4 text-amber-400 dark:text-amber-300 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </button>
            </CardContent>
          </Card>

          {/* Performance summary */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <BarChart3 className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Utilization bar */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-muted-foreground">Today&apos;s Utilization</span>
                    <span className="font-semibold text-foreground">{data.stats.utilizationPercent}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        data.stats.utilizationPercent >= 80
                          ? "bg-emerald-500"
                          : data.stats.utilizationPercent >= 50
                          ? "bg-amber-500"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${Math.min(data.stats.utilizationPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Completed</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200">{data.stats.completedCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <XCircle className="size-3.5 text-red-500 dark:text-red-400" />
                      <span className="text-xs text-red-700 dark:text-red-300 font-medium">Cancelled</span>
                    </div>
                    <p className="text-xl font-bold text-red-800 dark:text-red-200">{data.stats.cancelledCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">No-shows</span>
                    </div>
                    <p className="text-xl font-bold text-amber-800 dark:text-amber-200">{data.stats.noShowCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Phone className="size-3.5 text-sky-600 dark:text-sky-400" />
                      <span className="text-xs text-sky-700 dark:text-sky-300 font-medium">Available</span>
                    </div>
                    <p className="text-xl font-bold text-sky-800 dark:text-sky-200">{data.stats.availableSlotsToday}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivitySection clinicId={user.clinicId} />
    </div>
  );
}