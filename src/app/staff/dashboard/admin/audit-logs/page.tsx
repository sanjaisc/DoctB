"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, Loader2, ChevronLeft, ChevronRight, Download, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { AUDIT_ACTION_STYLES } from "@/lib/enums";
import { StatusBadge } from "@/components/staff/status-badge";
import { PageHeader } from "@/components/staff/PageHeader";
import { EmptyState } from "@/components/staff/empty-state";

interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  appointmentId: string | null;
  ipAddress: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
}

interface ErrorEntry {
  id: string;
  message: string;
  route?: string;
  stack?: string;
  timestamp: string;
}

export default function AuditLogsPage() {
  const [activeTab, setActiveTab] = useState("audit");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      params.set("page", String(page));
      const res = await fetch(`/api/staff/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setLogs(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, page]);

  const fetchErrors = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/admin/error-logs");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setErrors(json.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (activeTab === "audit") fetchLogs();
    if (activeTab === "errors") fetchErrors();
  }, [activeTab, fetchLogs, fetchErrors]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      params.set("format", "csv");
      const res = await fetch(`/api/staff/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported");
    } catch {
      toast.error("Failed to export");
    }
  };

  const handleClearErrors = async () => {
    try {
      await fetch("/api/staff/admin/error-logs", { method: "DELETE" });
      setErrors([]);
      toast.success("Error log cleared");
    } catch {
      toast.error("Failed to clear");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Audit & Error Logs"
        description="Browse platform-wide audit history and recent system errors."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="errors">System Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="pt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label htmlFor="action-filter">Filter by Action</Label>
              <Input
                id="action-filter"
                placeholder="e.g., BOOKING_CREATED, STAFF_LOGIN..."
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : logs.length === 0 ? (
            <EmptyState title="No audit logs match your filter." compact />
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b">
                    <TableHead className="px-4 py-2.5">Timestamp</TableHead>
                    <TableHead className="px-4 py-2.5 hidden md:table-cell">User</TableHead>
                    <TableHead className="px-4 py-2.5">Action</TableHead>
                    <TableHead className="px-4 py-2.5 hidden lg:table-cell">Target</TableHead>
                    <TableHead className="px-4 py-2.5 hidden lg:table-cell">Target ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, idx) => (
                    <TableRow key={log.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"} hover:bg-muted/30`}>
                      <TableCell className="px-4 py-2.5 text-xs tabular-nums">
                        {fmtDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 hidden md:table-cell">
                        <span className="font-medium">{log.userName}</span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5"><StatusBadge status={log.action} category="audit" /></TableCell>
                      <TableCell className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">
                        {log.targetType || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-xs font-mono text-muted-foreground hidden lg:table-cell truncate max-w-[120px]">
                        {log.targetId ? log.targetId.slice(0, 12) + "…" : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="errors" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Recent system errors captured in memory (last 100). Errors are not persisted across server restarts.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchErrors} className="gap-1.5">
                <RefreshCw className="size-3.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearErrors} className="gap-1.5 text-destructive">
                <Trash2 className="size-3.5" /> Clear
              </Button>
            </div>
          </div>

          {errors.length === 0 ? (
            <EmptyState title="No errors captured" description="All systems nominal." compact />
          ) : (
            <div className="space-y-2">
              {errors.map((err) => (
                <Card key={err.id} className="border-red-200 dark:border-red-900">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-red-800 dark:text-red-300 truncate">{err.message}</p>
                          {err.route && <Badge variant="outline" className="text-[10px]">{err.route}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{fmtDateTime(err.timestamp)}</p>
                        {err.stack && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Stack trace</summary>
                            <pre className="text-[10px] text-muted-foreground mt-1 p-2 bg-muted/50 rounded max-h-32 overflow-auto whitespace-pre-wrap">{err.stack}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
