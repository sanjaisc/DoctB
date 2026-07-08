"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  TrendingUp,
  XCircle,
  Clock,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Star,
  Users,
  Activity,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { DoctASessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/staff/PageHeader";
import { StatCard } from "@/components/staff/stat-card";
import { EmptyState } from "@/components/staff/empty-state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Period = "7d" | "30d" | "90d" | "custom";

interface DailyTrend {
  date: string;
  booked: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

interface ModalityData {
  inPerson: number;
  video: number;
  total: number;
}

interface ProviderPerf {
  name: string;
  total: number;
  completed: number;
  cancelled: number;
  noShowRate: number;
  avgRating: number;
}

interface SummaryStats {
  totalAppointments: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  avgDaily: number;
}

interface FinancialMetrics {
  totalDepositCents: number;
  totalSelfPayCents: number;
  totalPotentialRevenueCents: number;
  completedRevenueCents: number;
}

interface AnalyticsData {
  period: { start: string; end: string };
  dailyTrends: DailyTrend[];
  modality: ModalityData;
  providerPerformance: ProviderPerf[];
  summary: SummaryStats;
  financial: FinancialMetrics;
  busiestDay: string;
  busiestHour: string;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const COLORS = {
  completed: "#10b981",
  checkedIn: "#3b82f6",
  cancelled: "#f87171",
  noShow: "#fbbf24",
  inPerson: "#10b981",
  video: "#0ea5e9",
};

// ---------------------------------------------------------------------------
// Custom Tooltip for Area Chart
// ---------------------------------------------------------------------------
function AreaTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const labelMap: Record<string, string> = {
    completed: "Completed",
    checkedIn: "Checked In",
    cancelled: "Cancelled",
    noShow: "No Show",
    booked: "Booked",
  };

  return (
    <div className="rounded-xl border border-border/60 bg-background p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-semibold text-foreground">
        {label ? format(parseISO(label), "MMM d, yyyy") : ""}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {labelMap[entry.dataKey] ?? entry.dataKey}
          </span>
          <span className="ml-auto font-medium text-foreground">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pie chart label renderer for center text
// ---------------------------------------------------------------------------
function PieCenterLabel({
  cx,
  cy,
  viewBox,
  total,
}: {
  cx: number;
  cy: number;
  viewBox?: { width: number; height: number };
  total: number;
}) {
  if (!viewBox) return null;
  const centerX = cx;
  const centerY = cy;

  return (
    <text x={centerX} y={centerY - 6} textAnchor="middle" dominantBaseline="central">
      <tspan
        className="fill-foreground"
        style={{ fontSize: "20px", fontWeight: 700 }}
      >
        {total}
      </tspan>
      <tspan
        className="fill-muted-foreground"
        x={centerX}
        y={centerY + 14}
        style={{ fontSize: "10px" }}
      >
        total
      </tspan>
    </text>
  );
}

// ---------------------------------------------------------------------------
// Period button group
// ---------------------------------------------------------------------------
function PeriodSelector({
  value,
  onChange,
  onCustomToggle,
}: {
  value: Period;
  onChange: (p: Period) => void;
  onCustomToggle: () => void;
}) {
  const options: { label: string; value: Period }[] = [
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "90 Days", value: "90d" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div className="inline-flex items-center rounded-xl bg-muted/60 p-1 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => opt.value === "custom" ? onCustomToggle() : onChange(opt.value)}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
            value === opt.value
               ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 dark:bg-emerald-500 dark:shadow-emerald-500/25"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const user = session?.user as DoctASessionUser | undefined;

  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customDateFrom, setCustomDateFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [customDateTo, setCustomDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const fetchAnalytics = useCallback(async (p: Period, from?: string, to?: string) => {
    if (!user?.clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period: p });
      if (p === "custom" && from && to) {
        params.set("dateFrom", from);
        params.set("dateTo", to);
      }
      if (user.role === "SYSTEM_MANAGER" && user.clinicId) {
        params.set("clinicId", user.clinicId);
      }
      const res = await fetch(`/api/staff/analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.clinicId, user?.role]);

  const handleCustomRangeApply = () => {
    setPeriod("custom");
    setShowCustomPicker(false);
    fetchAnalytics("custom", customDateFrom, customDateTo);
  };

  useEffect(() => {
    if (status === "authenticated" && period !== "custom") fetchAnalytics(period);
  }, [status, period, fetchAnalytics]);

  // Period range label
  const dateRange =
    data?.period.start && data?.period.end
      ? `${format(parseISO(data.period.start), "MMM d")} – ${format(parseISO(data.period.end), "MMM d, yyyy")}`
      : "";

  // Modality pie data
  const modalityPieData = data
    ? [
        { name: "In-Person", value: data.modality.inPerson, color: COLORS.inPerson },
        { name: "Video", value: data.modality.video, color: COLORS.video },
      ].filter((d) => d.value > 0)
    : [];

  // -------------------------------------
  // Loading skeleton
  // -------------------------------------
  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-9 w-64 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[360px] rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl" />
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  // -------------------------------------
  // Error state
  // -------------------------------------
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="size-8 text-red-400 mb-3" />
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Failed to load analytics
          </p>
          <p className="text-xs text-red-600 mt-1 dark:text-red-300">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => fetchAnalytics(period)}
          >
            <RefreshCw className="size-3.5 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Analytics"
        description={
          <span className="flex items-center gap-2">
            <BarChart3 className="size-3.5" />
            {dateRange}
          </span>
        }
      >
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} onChange={setPeriod} onCustomToggle={() => setShowCustomPicker(!showCustomPicker)} />
          {showCustomPicker && (
            <div className="flex items-center gap-1.5 bg-muted/60 rounded-xl p-1.5">
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="h-8 w-36 text-xs"
              />
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600"
                onClick={handleCustomRangeApply}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </PageHeader>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Appointments"
          value={data.summary.totalAppointments}
          subtitle={`${data.summary.avgDaily} per day average`}
          icon={CalendarDays}
          gradient="bg-gradient-to-r from-emerald-500 to-teal-500"
          iconBg="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Completion Rate"
          value={`${data.summary.completionRate}%`}
          subtitle={`${data.dailyTrends.reduce((s, d) => s + d.completed, 0)} completed`}
          icon={CheckCircle2}
          gradient="bg-gradient-to-r from-emerald-500 to-green-500"
          iconBg="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Cancellation Rate"
          value={`${data.summary.cancellationRate}%`}
          subtitle={`${data.dailyTrends.reduce((s, d) => s + d.cancelled, 0)} cancelled`}
          icon={XCircle}
          gradient="bg-gradient-to-r from-red-400 to-rose-400"
          iconBg="bg-red-100 text-red-600"
        />
        <StatCard
          title="Avg Daily"
          value={data.summary.avgDaily}
          subtitle={`${data.busiestDay} is busiest`}
          icon={TrendingUp}
          gradient="bg-gradient-to-r from-amber-500 to-orange-500"
          iconBg="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Financial Summary */}
      {data.financial && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Potential Revenue"
            value={`$${(data.financial.totalPotentialRevenueCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Deposits + self-pay total"
            icon={DollarSign}
            gradient="bg-gradient-to-r from-blue-500 to-indigo-500"
            iconBg="bg-blue-100 text-blue-600"
          />
          <StatCard
            title="Completed Revenue"
            value={`$${(data.financial.completedRevenueCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Revenue from completed appts"
            icon={DollarSign}
            gradient="bg-gradient-to-r from-emerald-500 to-teal-500"
            iconBg="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            title="Total Deposits"
            value={`$${(data.financial.totalDepositCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Collected deposits"
            icon={DollarSign}
            gradient="bg-gradient-to-r from-amber-500 to-orange-500"
            iconBg="bg-amber-100 text-amber-600"
          />
          <StatCard
            title="Self-Pay Total"
            value={`$${(data.financial.totalSelfPayCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Self-pay amounts"
            icon={DollarSign}
            gradient="bg-gradient-to-r from-purple-500 to-violet-500"
            iconBg="bg-purple-100 text-purple-600"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart — Daily Trends (2/3) */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Activity className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Appointment Trends</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Daily breakdown by status
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.dailyTrends}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.completed} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.completed} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCheckedIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.checkedIn} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.checkedIn} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCancelled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.cancelled} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.cancelled} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gNoShow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.noShow} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.noShow} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => format(parseISO(v), "MMM dd")}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<AreaTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stackId="1"
                    stroke={COLORS.completed}
                    fill="url(#gCompleted)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="checkedIn"
                    stackId="1"
                    stroke={COLORS.checkedIn}
                    fill="url(#gCheckedIn)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cancelled"
                    stackId="1"
                    stroke={COLORS.cancelled}
                    fill="url(#gCancelled)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="noShow"
                    stackId="1"
                    stroke={COLORS.noShow}
                    fill="url(#gNoShow)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart — Modality Split (1/3) */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Modality Split</CardTitle>
                <p className="text-xs text-muted-foreground">
                  In-Person vs Video
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {modalityPieData.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modalityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {modalityPieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <PieCenterLabel
                      cx={0.5}
                      cy={0.5}
                      viewBox={{ width: 200, height: 200 }}
                      total={data.modality.total}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                      formatter={(value: number) => [`${value}`, "Appointments"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No appointments in this period
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: COLORS.inPerson }}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  In-Person
                </span>
                <span className="text-xs font-bold text-foreground">
                  {data.modality.inPerson}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: COLORS.video }}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  Video
                </span>
                <span className="text-xs font-bold text-foreground">
                  {data.modality.video}
                </span>
              </div>
            </div>

            {/* Busiest info */}
            <div className="w-full grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">
                  Busiest Day
                </p>
                <p className="text-sm font-bold text-foreground">
                  {data.busiestDay}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">
                  Busiest Hour
                </p>
                <p className="text-sm font-bold text-foreground">
                  {data.busiestHour}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Performance Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Star className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Provider Performance</CardTitle>
              <p className="text-xs text-muted-foreground">
                Individual metrics for the selected period
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {data.providerPerformance.length === 0 ? (
            <EmptyState icon={Users} title="No provider data" description="Appointments in this period will appear here." />
          ) : (
            <div className="-mx-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/60">
                    <TableHead className="py-3 px-4 text-xs font-semibold uppercase tracking-wider">Provider</TableHead>
                    <TableHead className="text-center py-3 px-3 text-xs font-semibold uppercase tracking-wider">Total</TableHead>
                    <TableHead className="text-center py-3 px-3 text-xs font-semibold uppercase tracking-wider">Completed</TableHead>
                    <TableHead className="text-center py-3 px-3 text-xs font-semibold uppercase tracking-wider">Cancelled</TableHead>
                    <TableHead className="text-center py-3 px-3 text-xs font-semibold uppercase tracking-wider">No-Show Rate</TableHead>
                    <TableHead className="text-center py-3 px-3 text-xs font-semibold uppercase tracking-wider">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.providerPerformance.map((provider, idx) => (
                    <TableRow
                      key={idx}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <Users className="size-3.5 text-emerald-700" />
                          </div>
                          <span className="font-medium text-foreground text-sm">
                            {provider.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-3 px-3 font-semibold text-foreground">
                        {provider.total}
                      </TableCell>
                      <TableCell className="text-center py-3 px-3">
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                        >
                          <CheckCircle2 className="size-3 mr-1" />
                          {provider.completed}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-3 px-3">
                        <Badge
                          variant="outline"
                          className="bg-red-50 text-red-600 border-red-200 text-xs dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
                        >
                          <XCircle className="size-3 mr-1" />
                          {provider.cancelled}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-3 px-3">
                        <span
                          className={`text-xs font-semibold ${
                            provider.noShowRate >= 20
      ? "text-red-600 dark:text-red-400"
      : provider.noShowRate >= 10
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {provider.noShowRate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3 px-3">
                        {provider.avgRating > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold text-foreground">
                              {provider.avgRating}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}