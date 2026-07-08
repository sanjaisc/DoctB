"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, Loader2, X, ChevronLeft, ChevronRight, AlertCircle, Calendar, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
import { StatusBadge } from "@/components/staff/status-badge";
import { PageHeader } from "@/components/staff/PageHeader";
import { EmptyState } from "@/components/staff/empty-state";

interface AppointmentRow {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  clinicId: string;
  clinicName: string;
  clinicSlug: string;
  providerId: string;
  providerName: string;
  serviceName: string;
  insuranceName: string;
  status: string;
  startTime: string;
  modality: string;
  depositCents: number;
  paymentStatus: string;
  duplicateEmailCount?: number;
  duplicatePhoneCount?: number;
}

interface WaitlistEntry {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  clinicName?: string;
  providerName?: string;
  serviceName?: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
}

const STATUS_OPTIONS = ["", "BOOKED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW", "ARCHIVED"];

export default function AdminAppointmentsPage() {
  const [activeTab, setActiveTab] = useState("search");
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [refundTarget, setRefundTarget] = useState<AppointmentRow | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refunding, setRefunding] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<AppointmentRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRow | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  const searchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      const res = await fetch(`/api/staff/admin/appointments?${params}`);
      if (!res.ok) throw new Error("Failed to search");
      const json = await res.json();
      setAppointments(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to search appointments");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, page]);

  const fetchWaitlist = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/waitlist?allClinics=true&status=ACTIVE,OFFERED");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setWaitlist(json.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (activeTab === "search") searchAppointments();
    if (activeTab === "waitlist") fetchWaitlist();
  }, [activeTab, searchAppointments, fetchWaitlist]);

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const res = await fetch("/api/staff/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: refundTarget.id, amountCents: refundAmount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Refund failed");
      }
      const json = await res.json();
      toast.success(json.note || "Refund initiated");
      setShowRefundDialog(false);
      searchAppointments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setRefunding(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/staff/appointments/${cancelTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Cancel failed");
      }
      toast.success("Appointment cancelled");
      setShowCancelDialog(false);
      searchAppointments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const openReschedule = async (appointment: AppointmentRow) => {
    setRescheduleTarget(appointment);
    setSelectedSlotId(null);
    setShowRescheduleDialog(true);
    setLoadingSlots(true);
    try {
      const dateFrom = new Date();
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() + 14);
      const res = await fetch(
        `/api/staff/slots?providerId=${appointment.providerId}&clinicId=${appointment.clinicId}&dateFrom=${dateFrom.toISOString().slice(0, 10)}&dateTo=${dateTo.toISOString().slice(0, 10)}&status=AVAILABLE`
      );
      if (!res.ok) throw new Error("Failed to load slots");
      const json = await res.json();
      setAvailableSlots(json.data || []);
    } catch {
      toast.error("Failed to load available slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !selectedSlotId) return;
    setRescheduling(true);
    try {
      const res = await fetch(`/api/staff/appointments/${rescheduleTarget.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSlotId: selectedSlotId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Reschedule failed");
      }
      toast.success("Appointment rescheduled");
      setShowRescheduleDialog(false);
      searchAppointments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reschedule failed");
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Global Appointment Oversight"
        description="Search, cancel, reschedule, or refund any appointment across all clinics."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="search">Appointment Search</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="pt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label htmlFor="global-search">Search</Label>
              <Input
                id="global-search"
                placeholder="Patient name, email, phone, or token..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1.5 w-36">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className=""><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s || "All"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="default" onClick={searchAppointments} disabled={loading}>
              {loading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Search className="size-4 mr-1.5" />}
              Search
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : appointments.length === 0 ? (
            <EmptyState title="No appointments found" description="Try a different search." compact />
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b">
                    <TableHead className="px-4 py-2.5">Patient</TableHead>
                    <TableHead className="px-4 py-2.5 hidden md:table-cell">Clinic</TableHead>
                    <TableHead className="px-4 py-2.5 hidden lg:table-cell">Provider</TableHead>
                    <TableHead className="px-4 py-2.5 hidden lg:table-cell">Service</TableHead>
                    <TableHead className="text-center px-3 py-2.5">Status</TableHead>
                    <TableHead className="text-right px-4 py-2.5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((a, idx) => (
                    <TableRow key={a.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"} hover:bg-muted/30`}>
                      <TableCell className="px-4 py-2.5">
                        <p className="font-medium">{a.patientName}</p>
                        <p className="text-xs text-muted-foreground">{a.patientEmail}</p>
                        <div className="flex gap-1 mt-1">
                          {(a.duplicateEmailCount || 0) > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
                              Same email: {a.duplicateEmailCount} other{(a.duplicateEmailCount || 0) > 1 ? "s" : ""}
                            </span>
                          )}
                          {(a.duplicatePhoneCount || 0) > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
                              Same phone: {a.duplicatePhoneCount} other{(a.duplicatePhoneCount || 0) > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{a.clinicName}</TableCell>
                      <TableCell className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">{a.providerName}</TableCell>
                      <TableCell className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">{a.serviceName}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center"><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === "BOOKED" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-amber-600 dark:text-amber-400"
                                onClick={() => openReschedule(a)}
                              >
                                <Calendar className="size-3 mr-1" /> Reschedule
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-destructive"
                                onClick={() => { setCancelTarget(a); setShowCancelDialog(true); }}
                              >
                                <Ban className="size-3 mr-1" /> Cancel
                              </Button>
                            </>
                          )}
                          {a.depositCents > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-destructive"
                              onClick={() => { setRefundTarget(a); setRefundAmount(a.depositCents); setShowRefundDialog(true); }}
                            >
                              Refund
                            </Button>
                          )}
                        </div>
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

        <TabsContent value="waitlist" className="pt-4 space-y-4">
          {waitlist.length === 0 ? (
            <EmptyState title="No active waitlist entries" description="No waitlist entries across all clinics." compact />
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b">
                    <TableHead className="px-4 py-2.5">Patient</TableHead>
                    <TableHead className="px-4 py-2.5">Status</TableHead>
                    <TableHead className="px-4 py-2.5 hidden md:table-cell">Date Range</TableHead>
                    <TableHead className="px-4 py-2.5 hidden md:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitlist.map((w, idx) => (
                    <TableRow key={w.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"} hover:bg-muted/30`}>
                      <TableCell className="px-4 py-2.5 font-medium">{w.patientName}</TableCell>
                      <TableCell className="px-4 py-2.5"><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="px-4 py-2.5 text-muted-foreground hidden md:table-cell text-xs">
                        {fmtDate(w.dateFrom)} – {fmtDate(w.dateTo)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-muted-foreground hidden md:table-cell text-xs">
                        {fmtDate(w.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Cancel the appointment for {cancelTarget?.patientName} at {cancelTarget?.clinicName}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-800 dark:text-red-300">This will release the slot and notify the patient. This action cannot be undone.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="">Keep Appointment</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling} className="">
              {cancelling && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new slot for {rescheduleTarget?.patientName}.
            </DialogDescription>
          </DialogHeader>
          {loadingSlots ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
          ) : availableSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No available slots found for the next 14 days.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableSlots.map((slot: any) => (
                <div
                  key={slot.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSlotId === slot.id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedSlotId(slot.id)}
                >
                  <p className="text-sm font-medium">
                    {fmtDateTime(slot.startTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">{slot.modality === "VIDEO" ? "Video Visit" : "In-Person"}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="">Cancel</Button>
            </DialogClose>
            <Button onClick={handleReschedule} disabled={rescheduling || !selectedSlotId} className="">
              {rescheduling && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Refund</DialogTitle>
            <DialogDescription>
              Create a refund record for {refundTarget?.patientName}. Stripe is not configured — this will create a pending refund entry for manual processing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">Stripe SDK is not installed. This creates a ledger entry only — process the actual refund manually.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Refund Amount (cents)</Label>
              <Input type="number" min={0} value={refundAmount} onChange={(e) => setRefundAmount(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRefund} disabled={refunding} className="">
              {refunding && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Queue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
