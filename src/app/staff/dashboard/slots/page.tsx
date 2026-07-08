"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Clock,
  CalendarDays,
  Calendar,
  Lock,
  Unlock,
  ExternalLink,
  CheckSquare,
  Square,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  User,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, isSameDay } from "date-fns";
import { SLOT_STATUS_STYLES, SLOT_STATUS_LABELS } from "@/lib/enums";
import { StatusBadge } from "@/components/staff/status-badge";
import { PageHeader } from "@/components/staff/PageHeader";
import { EmptyState } from "@/components/staff/empty-state";

// =============================================================================
// Types
// =============================================================================

interface SlotItem {
  id: string;
  startTime: string;
  endTime: string;
  modality: string;
  status: string;
  provider: { id: string; firstName: string; lastName: string; credentials: string | null };
  appointment: { id: string; patientName: string; status: string } | null;
  templateId: string | null;
}

interface ProviderOption {
  id: string;
  firstName: string;
  lastName: string;
  credentials: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "BOOKED", label: "Booked" },
  { value: "BOOKED_EXTERNALLY", label: "Externally Booked" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "LOCKED", label: "Locked" },
  { value: "CLOSED", label: "Closed" },
];

// =============================================================================
// Component
// =============================================================================

export default function SlotManagementPage() {
  const { data: session } = useSession();
  const clinicId = session?.user?.clinicId as string | undefined;

  // Filters
  const [providerId, setProviderId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date().setDate(new Date().getDate() + 6), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Data
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState<"BLOCK" | "UNBLOCK" | "BOOKED_EXTERNALLY" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Expanded dates
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Toggle date expansion
  const toggleDate = (dateStr: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  // Fetch slots
  const fetchSlots = useCallback(async () => {
    if (!providerId || !dateFrom || !dateTo) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        providerId,
        dateFrom,
        dateTo,
      });
      if (statusFilter) params.set("status", statusFilter);
      if (clinicId) params.set("clinicId", clinicId);

      const res = await fetch(`/api/staff/slots?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch slots");
      }
      const data = await res.json();
      setSlots(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [providerId, dateFrom, dateTo, statusFilter, clinicId]);

  // Fetch providers for the clinic
  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      try {
        const res = await fetch(`/api/staff/providers?clinicId=${clinicId}`);
        if (res.ok) {
          const data = await res.json();
          const allProviders = (data.data || []).map(
            (p: Record<string, unknown>) => ({
              id: p.id as string,
              firstName: (p.firstName as string) || "",
              lastName: (p.lastName as string) || "",
              credentials: (p.credentials as string) || null,
            })
          );
          setProviders(allProviders);
          // Auto-select first provider
          if (allProviders.length > 0 && !providerId) {
            setProviderId(allProviders[0].id);
          }
        }
      } catch {
        // non-critical
      }
    })();
    }, [clinicId, providerId]);

  // Fetch slots when filters change
  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Reset selection on filter change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [providerId, dateFrom, dateTo, statusFilter]);

  // Toggle slot selection
  const toggleSlot = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select/deselect all visible
  const toggleAll = () => {
    const actionableSlots = slots.filter((s) =>
      s.status === "AVAILABLE" || s.status === "BLOCKED"
    );
    if (selectedIds.size === actionableSlots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(actionableSlots.map((s) => s.id)));
    }
  };

  // Execute slot action
  const executeAction = async () => {
    if (!confirmAction || selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      const params = new URLSearchParams();
      if (clinicId) params.set("clinicId", clinicId);

      const res = await fetch(`/api/staff/slots?${params.toString()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotIds: Array.from(selectedIds),
          action: confirmAction,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update slots");
      }

      const result = await res.json();
      setSelectedIds(new Set());
      setConfirmAction(null);
      fetchSlots();

      const actionLabel = confirmAction === 'BLOCK' ? 'blocked' : confirmAction === 'UNBLOCK' ? 'unblocked' : 'marked as externally booked';
      toast.success(`${result.updatedCount} slot(s) ${actionLabel}`, {
        description: result.skipped?.length
          ? `${result.skipped.length} slot(s) skipped (invalid transitions)`
          : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update slots");
    } finally {
      setActionLoading(false);
    }
  };

  // Group slots by date
  const slotsByDate = slots.reduce<Record<string, SlotItem[]>>((acc, slot) => {
    const dateKey = format(parseISO(slot.startTime), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});

  const sortedDates = Object.keys(slotsByDate).sort();

  // Check which actions are possible for selected
  const selectedSlots = slots.filter((s) => selectedIds.has(s.id));
  const hasAvailable = selectedSlots.some((s) => s.status === "AVAILABLE");
  const hasBlocked = selectedSlots.some((s) => s.status === "BLOCKED");

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Slot Management"
        description="View, block, and manage provider time slots"
      />

      {/* Filter Bar */}
      <div className="bg-background rounded-xl border border-border/60 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Provider Select */}
          <Select value={providerId} onValueChange={setProviderId}>
            <SelectTrigger className="w-full sm:w-64 h-9">
              <SelectValue placeholder="Select provider..." />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  Dr. {p.firstName} {p.lastName}
                  {p.credentials ? `, ${p.credentials}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "__all"} value={opt.value || "__all"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date From */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-36"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-36"
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 dark:bg-emerald-950/30 dark:border-emerald-800">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
            <CheckSquare className="size-4" />
            {selectedIds.size} slot{selectedIds.size !== 1 ? "s" : ""} selected
          </div>
          <div className="h-5 w-px bg-emerald-200 dark:bg-emerald-800" />
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            disabled={!hasAvailable}
            onClick={() => setConfirmAction("BLOCK")}
          >
            <Lock className="size-3.5 mr-1.5" />
            Block Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            disabled={!hasBlocked}
            onClick={() => setConfirmAction("UNBLOCK")}
          >
            <Unlock className="size-3.5 mr-1.5" />
            Unblock Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/30 dark:hover:text-purple-300"
            disabled={!hasAvailable}
            onClick={() => setConfirmAction("BOOKED_EXTERNALLY")}
          >
            <ExternalLink className="size-3.5 mr-1.5" />
            Mark Ext. Booked
          </Button>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="size-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {!providerId ? (
        <div className="bg-background rounded-xl border border-border/60 shadow-sm">
          <EmptyState icon={CalendarDays} title="Select a provider to view slots" />
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-background rounded-xl border border-border/60 shadow-sm p-4 space-y-2">
              <Skeleton className="h-5 w-36" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-20 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-background rounded-xl border border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/30">
          <EmptyState icon={AlertTriangle} title={error} action={<Button variant="outline" size="sm" onClick={fetchSlots}>Retry</Button>} />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="bg-background rounded-xl border border-border/60 shadow-sm">
          <EmptyState icon={Clock} title="No slots found" description="Try adjusting the date range or status filter" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All Toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{slots.length}</span> slot{slots.length !== 1 ? "s" : ""} across{" "}
              <span className="font-medium text-foreground">{sortedDates.length}</span> day{sortedDates.length !== 1 ? "s" : ""}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={toggleAll}
            >
              {selectedIds.size > 0 ? "Deselect All" : "Select All Available"}
            </Button>
          </div>

          {/* Date Groups */}
          {sortedDates.map((dateKey) => {
            const dateSlots = slotsByDate[dateKey];
            const dateObj = parseISO(dateKey);
            const isToday = isSameDay(dateObj, new Date());
            const isExpanded = expandedDates.has(dateKey) || sortedDates.length <= 3;

            return (
              <div key={dateKey} className="bg-background rounded-xl border border-border/60 shadow-sm overflow-hidden">
                {/* Date Header */}
                <button
                  onClick={() => toggleDate(dateKey)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {isExpanded ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                    <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold">
                      {format(dateObj, "EEEE, MMMM d, yyyy")}
                    </span>
                    {isToday && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                        Today
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {dateSlots.length} slot{dateSlots.length !== 1 ? "s" : ""}
                    </span>
                    {/* Status summary */}
                    <div className="hidden sm:flex items-center gap-1">
                      {(() => {
                        const counts: Record<string, number> = {};
                        dateSlots.forEach((s) => {
                          counts[s.status] = (counts[s.status] || 0) + 1;
                        });
                        return Object.entries(counts)
                          .filter(([, count]) => count > 0)
                          .map(([status, count]) => (
                            <Badge
                              key={status}
                              variant="outline"
                              className={`text-[10px] ${SLOT_STATUS_STYLES[status] || ""}`}
                            >
                              {count} {SLOT_STATUS_LABELS[status]}
                            </Badge>
                          ));
                      })()}
                    </div>
                  </div>
                </button>

                {/* Slots Grid */}
                {isExpanded && (
                  <div className="border-t border-border/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 p-3">
                      {dateSlots.map((slot) => {
                        const isSelected = selectedIds.has(slot.id);
                        const isSelectable =
                          slot.status === "AVAILABLE" || slot.status === "BLOCKED";

                        return (
                          <div
                            key={slot.id}
                            onClick={() => isSelectable && toggleSlot(slot.id)}
                            className={`
                              relative rounded-lg border p-3 transition-all cursor-pointer
                              ${isSelected ? "ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/50 dark:ring-emerald-400 dark:border-emerald-600 dark:bg-emerald-950/40" : "border-border/50 hover:border-emerald-200 hover:bg-emerald-50/20 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"}
                              ${!isSelectable ? "opacity-70 cursor-default" : ""}
                            `}
                          >
                            {/* Checkbox for selectable */}
                            {isSelectable && (
                              <div className="absolute top-2 right-2">
                                {isSelected ? (
                                  <CheckSquare className="size-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Square className="size-4 text-muted-foreground/40" />
                                )}
                              </div>
                            )}

                            {/* Time */}
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Clock className="size-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {format(parseISO(slot.startTime), "h:mm a")}
                              </span>
                            </div>

                            {/* Modality */}
                            <div className="mb-2">
                              {slot.modality === "VIDEO" ? (
                                <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 text-[10px] dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30">
                                  <Calendar className="size-2.5 mr-0.5" />
                                  Video
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50 text-[10px] dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/30">
                                  <CalendarDays className="size-2.5 mr-0.5" />
                                  In-Clinic
                                </Badge>
                              )}
                            </div>

                            {/* Status Badge */}
                            <StatusBadge status={slot.status} category="slot" />

                            {/* Appointment info */}
                            {slot.appointment && (
                              <div className="mt-1.5 pt-1.5 border-t border-border/30">
                                <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                  <User className="size-2.5" />
                                  {slot.appointment.patientName}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================== */}
      {/* CONFIRMATION DIALOG                                                */}
      {/* ================================================================== */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500 dark:text-amber-400" />
              Confirm Slot Action
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "BLOCK" && (
                <>
                  You are about to <span className="font-semibold text-red-600 dark:text-red-300">block</span>{" "}
                  {selectedIds.size} slot{selectedIds.size !== 1 ? "s" : ""}. Blocked slots will not
                  be available for patient booking.
                </>
              )}
              {confirmAction === "UNBLOCK" && (
                <>
                  You are about to <span className="font-semibold text-emerald-600 dark:text-emerald-300">unblock</span>{" "}
                  {selectedIds.size} slot{selectedIds.size !== 1 ? "s" : ""}. These slots will become
                  available for patient booking.
                </>
              )}
              {confirmAction === "BOOKED_EXTERNALLY" && (
                <>
                  You are about to mark {selectedIds.size} slot
                  {selectedIds.size !== 1 ? "s" : ""} as{" "}
                  <span className="font-semibold text-purple-600 dark:text-purple-300">externally booked</span>. These
                  slots will be shown as booked but will not have a DoctA appointment
                  associated.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              className=""
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={actionLoading}
              className={`${
  confirmAction === "BLOCK"
  ? "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
  : confirmAction === "UNBLOCK"
  ? "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
  : "bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
  } text-white`}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  Updating...
                </>
              ) : confirmAction === "BLOCK" ? (
                <>
                  <Lock className="size-4 mr-1.5" />
                  Block {selectedIds.size} Slot{selectedIds.size !== 1 ? "s" : ""}
                </>
              ) : confirmAction === "UNBLOCK" ? (
                <>
                  <Unlock className="size-4 mr-1.5" />
                  Unblock {selectedIds.size} Slot{selectedIds.size !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  <ExternalLink className="size-4 mr-1.5" />
                  Mark {selectedIds.size} as Ext. Booked
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}