"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Loader2, RefreshCw, TrendingUp, Users, CalendarCheck, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtCurrency } from "@/lib/format";
import { PageHeader } from "@/components/staff/PageHeader";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

interface AnalyticsData {
  total: number;
  completed: number;
  cancelled: number;
  noShows: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  dailyVolume: { date: string; booked: number; checkedIn: number; completed: number; cancelled: number; noShow: number }[];
  modalitySplit: { inPerson: number; video: number };
  depositCapture: { captured: number; pending: number };
  conversion: { totalWithRanking: number; earliest: number; nearest: number; recommendationAcceptance: number };
  busiestDay: string;
  avgDaily: number;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/admin/analytics?period=${period}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statCards = data ? [
    { label: "Total Appointments", value: data.total.toLocaleString(), icon: CalendarCheck, gradient: "from-blue-500 to-blue-600" },
    { label: "Completion Rate", value: `${data.completionRate}%`, icon: TrendingUp, gradient: "from-emerald-500 to-emerald-600" },
    { label: "Cancellation Rate", value: `${data.cancellationRate}%`, icon: XCircle, gradient: "from-amber-500 to-amber-600" },
    { label: "No-Show Rate", value: `${data.noShowRate}%`, icon: Users, gradient: "from-red-500 to-red-600" },
    { label: "Avg Daily", value: String(data.avgDaily), icon: BarChart3, gradient: "from-purple-500 to-purple-600" },
  ] : [];

  const modalityData = data ? [
    { name: "In-Person", value: data.modalitySplit.inPerson },
    { name: "Video", value: data.modalitySplit.video },
  ] : [];

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Platform Analytics"
        description="Cross-clinic aggregated metrics and trends."
      >
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </PageHeader>

      {loading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="relative overflow-hidden border-0 shadow-md">
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />
                  <CardContent className="relative p-4">
                    <Icon className="size-5 text-white/80 mb-2" />
                    <p className="text-2xl font-bold text-white tabular-nums">{s.value}</p>
                    <p className="text-xs text-white/80 font-medium">{s.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Daily Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Appointment Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyVolume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="completed" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Completed" />
                    <Area type="monotone" dataKey="checkedIn" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Checked In" />
                    <Area type="monotone" dataKey="booked" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} name="Booked" />
                    <Area type="monotone" dataKey="cancelled" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="Cancelled" />
                    <Area type="monotone" dataKey="noShow" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="No Show" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Modality Split + Conversion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Modality Split */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Modality Split</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={modalityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {modalityData.map((_, idx) => <Cell key={idx} fill={COLORS[idx]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Conversion & Revenue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">Recommendation Acceptance</p>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{data.conversion.recommendationAcceptance}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{data.conversion.earliest} earliest / {data.conversion.nearest} nearest</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">Deposit Volume</p>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtCurrency(data.depositCapture.captured)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fmtCurrency(data.depositCapture.pending)} pending</p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Busiest Day</p>
                  <p className="text-xl font-bold tabular-nums">{data.busiestDay}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
