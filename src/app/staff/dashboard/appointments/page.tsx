"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Search,
  Calendar,
  MoreHorizontal,
  Eye,
  UserCheck,
  CheckCircle2,
  XCircle,
  UserX,
  Clock,
  Phone,
  Mail,
  User,
  FileText,
  CreditCard,
  Shield,
  Baby,
  Send,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Loader2,
  CalendarDays,
  StickyNote,
  DollarSign,
  Hash,
  Bell,
  QrCode,
  Pencil,
  Check,
  ArrowRight,
  RefreshCw,
  Video,
  ExternalLink,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { QrCodeDisplay } from "@/components/qr-code-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parseISO, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/staff/status-badge";
import { PageHeader } from "@/components/staff/PageHeader";
import { EmptyState } from "@/components/staff/empty-state";

// =============================================================================
// Types
// =============================================================================

interface AppointmentRow {
  id: string;
  patientName: string;
  patientDob: string;
  patientPhone: string;
  patientEmail: string;
  patientType: string;
  guardianName: string | null;
  guardianRelation: string | null;
  reasonForVisit: string;
  modality: string;
  startTime: string;
  endTime: string;
  status: string;
  isDemoInsurance: boolean;
  depositCents: number;
  selfPayCents: number;
  paymentStatus: string;
  paymentMethod: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  intakeCompleted: boolean;
  insuranceVerified: boolean;
  createdAt: string;
  provider: { id: string; firstName: string; lastName: string; credentials: string | null };
  service: { id: string; name: string };
  slot: { id: string; modality: string; status: string };
  insurance: { id: string; name: string; isDemo: boolean } | null;
}

interface AppointmentDetail extends AppointmentRow {
  specialty: { id: string; name: string };
  clinic: { id: string; name: string; phoneNumber: string };
  ledger: {
    id: string;
    type: string;
    amountCents: number;
    description: string | null;
    paymentStatus: string | null;
    processedBy: string | null;
    createdAt: string;
  } | null;
  tokens: {
    id: string;
    purpose: string;
    createdAt: string;
    expiresAt: string;
    consumedAt: string | null;
  }[];
  notes: NoteItem[];
  validTransitions: string[];
}

interface NoteItem {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; role: string } | null;
}

interface ProviderOption {
  id: string;
  firstName: string;
  lastName: string;
  credentials: string | null;
}

interface RescheduleSlot {
  id: string;
  startTime: string;
  endTime: string;
  modality: string;
}

interface WaitlistRow {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientType: string;
  preferredModality: string | null;
  status: string;
  contactCount: number;
  lastContactAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  providerName: string;
  specialtyName: string;
}

// =============================================================================
// Status Helpers
// =============================================================================

const TRANSITION_LABELS: Record<string, string> = {
  CHECKED_IN: "Check In",
  COMPLETED: "Complete",
  CANCELLED: "Cancel",
  NO_SHOW: "No Show",
  ARCHIVED: "Archive",
};

const TRANSITION_ICONS: Record<string, React.ReactNode> = {
  CHECKED_IN: <UserCheck className="size-3.5" />,
  COMPLETED: <CheckCircle2 className="size-3.5" />,
  CANCELLED: <XCircle className="size-3.5" />,
  NO_SHOW: <UserX className="size-3.5" />,
  ARCHIVED: <FileText className="size-3.5" />,
};

// =============================================================================
// Component
// =============================================================================

export default function AppointmentsPage() {
  const { data: session } = useSession();
  const clinicId = session?.user?.clinicId as string | undefined;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Data
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Providers
  const [providers, setProviders] = useState<ProviderOption[]>([]);

  // Detail dialog
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Patient edit mode in detail dialog
  const [editingPatient, setEditingPatient] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editInsuranceVerified, setEditInsuranceVerified] = useState(false);
  const [patientSaving, setPatientSaving] = useState(false);

  // Status transition
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  // Confirmation dialog for status transitions
  const [confirmDialog, setConfirmDialog] = useState<{
    appointmentId: string;
    newStatus: string;
    patientName: string;
  } | null>(null);
  const [confirmReason, setConfirmReason] = useState("PATIENT_CANCELLED");

  // QR Code dialog
  const [qrAppointmentId, setQrAppointmentId] = useState<string | null>(null);
  const [qrPatientName, setQrPatientName] = useState<string | undefined>(undefined);

  // View mode: appointments or waitlist
  const [viewMode, setViewMode] = useState<"appointments" | "waitlist">("appointments");

  // Waitlist data
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistRow[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistActionId, setWaitlistActionId] = useState<string | null>(null);

  // Reschedule dialog
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentRow | null>(null);
  const [rescheduleProviderId, setRescheduleProviderId] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleSlots, setRescheduleSlots] = useState<RescheduleSlot[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleSelectedSlotId, setRescheduleSelectedSlotId] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Build query params
  const buildQuery = useCallback(
    (overrides?: { pageOverride?: number }) => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (search) params.set("search", search);
      if (providerFilter) params.set("providerId", providerFilter);
      params.set("page", String(overrides?.pageOverride ?? page));
      params.set("limit", "20");
      if (clinicId) params.set("clinicId", clinicId);
      return params.toString();
    },
    [statusFilter, dateFrom, dateTo, search, providerFilter, page, clinicId]
  );

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/appointments?${buildQuery()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch appointments");
      }
      const data = await res.json();
      setAppointments(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  // Fetch providers
  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      try {
        const res = await fetch(`/api/taxonomies?clinicId=${clinicId}&include=providers`);
        if (res.ok) {
          // Providers come from the dashboard or we use a simpler approach
        }
      } catch {
        // non-critical
      }
    })();
  }, [clinicId]);

  // Track previous filter values to detect non-page filter changes
  const prevFiltersRef = useRef({ statusFilter, dateFrom, dateTo, search, providerFilter });

  // Single effect: fetch appointments on any dependency change, reset page on filter change
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const filterChanged =
      prev.statusFilter !== statusFilter ||
      prev.dateFrom !== dateFrom ||
      prev.dateTo !== dateTo ||
      prev.search !== search ||
      prev.providerFilter !== providerFilter;
    prevFiltersRef.current = { statusFilter, dateFrom, dateTo, search, providerFilter };

    if (filterChanged) {
      setPage(1);
      // fetchAppointments will re-run with page=1 via the dependency update below
      return;
    }
    fetchAppointments();
  }, [statusFilter, dateFrom, dateTo, search, providerFilter, page, fetchAppointments]);

  // Fetch providers for the clinic
  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      try {
        const res = await fetch(`/api/staff/dashboard?clinicId=${clinicId}`);
        if (res.ok) {
          const data = await res.json();
          // We need a provider list - let's fetch from appointments
          // Actually, let's use the taxonomies endpoint or a separate query
          // For now, we'll extract unique providers from the dashboard data
        }
      } catch {
        // non-critical
      }
      // Fallback: fetch providers from the clinic via search/taxonomies
      try {
        const res = await fetch(
          `/api/search/providers?specialty=&patientType=ADULT&lat=40.758&lng=-73.985&radius=50&limit=50`
        );
        if (res.ok) {
          const data = await res.json();
          const allProviders = (data.providers || []).map(
            (p: Record<string, unknown>) => ({
              id: p.id as string,
              firstName: (p.firstName as string) || "",
              lastName: (p.lastName as string) || "",
              credentials: (p.credentials as string) || null,
            })
          );
          // Filter by clinic if possible
          setProviders(allProviders);
        }
      } catch {
        // non-critical
      }
    })();
  }, [clinicId]);

  // Open detail dialog
  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    setNoteContent("");
    setEditingPatient(false);
    try {
      const res = await fetch(`/api/staff/appointments/${id}`);
      if (!res.ok) throw new Error("Failed to load appointment");
      const data = await res.json();
      setDetail(data);
      // Populate edit fields
      setEditName(data.patientName);
      setEditEmail(data.patientEmail);
      setEditPhone(data.patientPhone);
      setEditInsuranceVerified(data.insuranceVerified ?? false);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Status transition — opens confirmation dialog first
  const handleTransition = (appointmentId: string, newStatus: string, patientName?: string) => {
    setConfirmDialog({ appointmentId, newStatus, patientName: patientName || "this appointment" });
    setConfirmReason("PATIENT_CANCELLED");
  };

  // Execute the confirmed transition
  const handleConfirmTransition = async () => {
    if (!confirmDialog) return;
    const { appointmentId, newStatus } = confirmDialog;
    setTransitioningId(appointmentId);
    setConfirmDialog(null);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (newStatus === "CANCELLED") {
        body.cancellationReason = confirmReason;
      }
      const res = await fetch(`/api/staff/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
      // Refresh list
      fetchAppointments();
      // Refresh detail if open
      if (selectedId === appointmentId) {
        openDetail(appointmentId);
      }
      const statusLabels: Record<string, string> = {
        CHECKED_IN: "checked in",
        COMPLETED: "marked as completed",
        CANCELLED: "cancelled",
        NO_SHOW: "marked as no-show",
      };
      toast.success(`Appointment ${statusLabels[newStatus] || "updated"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setTransitioningId(null);
    }
  };

  // Add note
  const handleAddNote = async () => {
    if (!selectedId || !noteContent.trim()) return;
    setNoteSubmitting(true);
    try {
      const res = await fetch(`/api/staff/appointments/${selectedId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      setNoteContent("");
      // Refresh detail
      openDetail(selectedId);
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Save patient contact details + insurance verified
  const handleSavePatient = async () => {
    if (!selectedId || !detail) return;
    setPatientSaving(true);
    try {
      const body: Record<string, unknown> = {
        patientName: editName,
        patientEmail: editEmail,
        patientPhone: editPhone,
        insuranceVerified: editInsuranceVerified,
      };
      const res = await fetch(`/api/staff/appointments/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update patient details");
      }
      setEditingPatient(false);
      // Refresh detail to get updated data
      openDetail(selectedId);
      toast.success("Patient details updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update patient details");
    } finally {
      setPatientSaving(false);
    }
  };

  // ---- Reschedule ----
  const openReschedule = (apt: AppointmentRow) => {
    setRescheduleApt(apt);
    setRescheduleProviderId(apt.provider.id);
    setRescheduleDate(undefined);
    setRescheduleSlots([]);
    setRescheduleSelectedSlotId("");
  };

  const handleRescheduleProviderChange = async (providerId: string) => {
    setRescheduleProviderId(providerId);
    setRescheduleSelectedSlotId("");
    if (rescheduleDate) {
      await fetchRescheduleSlots(providerId, rescheduleDate);
    } else {
      setRescheduleSlots([]);
    }
  };

  const handleRescheduleDateChange = async (date: Date | undefined) => {
    setRescheduleDate(date);
    setRescheduleSelectedSlotId("");
    if (date && rescheduleProviderId) {
      await fetchRescheduleSlots(rescheduleProviderId, date);
    } else {
      setRescheduleSlots([]);
    }
  };

  const fetchRescheduleSlots = async (providerId: string, date: Date) => {
    setRescheduleSlotsLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/staff/book?providerId=${providerId}&date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to load slots");
      const data = await res.json();
      setRescheduleSlots(data.slots || []);
    } catch {
      setRescheduleSlots([]);
      toast.error("Failed to load available slots");
    } finally {
      setRescheduleSlotsLoading(false);
    }
  };

  const handleRescheduleConfirm = async () => {
    if (!rescheduleApt || !rescheduleSelectedSlotId || rescheduleSubmitting) return;
    setRescheduleSubmitting(true);
    try {
      const res = await fetch(`/api/staff/appointments/${rescheduleApt.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSlotId: rescheduleSelectedSlotId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Reschedule failed");
      }
      toast.success("Appointment rescheduled successfully");
      setRescheduleApt(null);
      fetchAppointments();
      // Also refresh detail if this appointment's detail is open
      if (selectedId === rescheduleApt.id) {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule");
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // Fetch waitlist entries
  const fetchWaitlist = useCallback(async () => {
    if (!clinicId) return;
    setWaitlistLoading(true);
    setWaitlistError(null);
    try {
      const res = await fetch(`/api/staff/waitlist?clinicId=${clinicId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch waitlist");
      }
      const data = await res.json();
      setWaitlistEntries(data.data || []);
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : "Failed to fetch waitlist");
    } finally {
      setWaitlistLoading(false);
    }
  }, [clinicId]);

  // Fetch waitlist when view mode changes
  useEffect(() => {
    if (viewMode === "waitlist") {
      fetchWaitlist();
    }
  }, [viewMode, fetchWaitlist]);

  // Waitlist action handler (update status or contact)
  const handleWaitlistAction = async (entryId: string, action: string) => {
    setWaitlistActionId(entryId);
    try {
      const body: Record<string, unknown> = { id: entryId };
      if (action === "contact") {
        body.incrementContact = true;
      } else {
        body.status = action;
      }
      const res = await fetch("/api/staff/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update waitlist entry");
      }
      fetchWaitlist();
      const actionLabels: Record<string, string> = {
        OFFERED: "marked as offered",
        EXPIRED: "marked as expired",
        contact: "contact recorded",
      };
      toast.success(`Entry ${actionLabels[action] || "updated"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setWaitlistActionId(null);
    }
  };

  // Format cents
  const formatCents = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Modality badge
  const ModalityBadge = ({ modality }: { modality: string }) => {
    if (modality === "VIDEO") {
      return (
        <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
          <Calendar className="size-3 mr-1" />
          Video
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
        <CalendarDays className="size-3 mr-1" />
        In-Clinic
      </Badge>
    );
  };

  // Filter tabs
  const statusTabs = [
    { key: "", label: "All" },
    { key: "BOOKED", label: "Booked" },
    { key: "CHECKED_IN", label: "Checked In" },
    { key: "COMPLETED", label: "Completed" },
    { key: "CANCELLED", label: "Cancelled" },
    { key: "NO_SHOW", label: "No Show" },
    { key: "__WAITLIST__", label: "Waitlist", isWaitlist: true },
  ];

  // Waitlist status styles
  const WL_STATUS_STYLES: Record<string, string> = {
    ACTIVE: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    OFFERED: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    EXPIRED: "bg-muted text-muted-foreground border-border",
    FULFILLED: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    REMOVED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  };

  const WL_STATUS_LABELS: Record<string, string> = {
    ACTIVE: "Waiting",
    OFFERED: "Offered",
    EXPIRED: "Expired",
    FULFILLED: "Accepted",
    REMOVED: "Removed",
  };

  // Conflict detection: check if an appointment overlaps with any other for same provider on same date
  const getConflicts = (apt: AppointmentRow): AppointmentRow[] => {
    if (!appointments.length) return [];
    return appointments.filter((other) => {
      if (other.id === apt.id) return false;
      if (other.provider.id !== apt.provider.id) return false;
      const aptDate = apt.startTime.slice(0, 10);
      const otherDate = other.startTime.slice(0, 10);
      if (aptDate !== otherDate) return false;
      if (other.status === "CANCELLED" || other.status === "NO_SHOW") return false;
      return apt.startTime < other.endTime && apt.endTime > other.startTime;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Appointments"
        description="Manage and review all clinic appointments"
      />

      {/* Filter Bar */}
      <div className="bg-background rounded-xl border border-border/60 shadow-sm p-4 space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {statusTabs.map((tab) => {
            const isWl = 'isWaitlist' in tab && tab.isWaitlist;
            const isActive = isWl
              ? viewMode === "waitlist"
              : viewMode === "appointments" && statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (isWl) {
                    setViewMode("waitlist");
                  } else {
                    setViewMode("appointments");
                    setStatusFilter(tab.key);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer border ${
                  isActive
                    ? isWl
                      ? "bg-amber-600 dark:bg-amber-500 text-white border-amber-600 dark:border-amber-500 shadow-sm"
                      : "bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {isWl && <Bell className="size-3 mr-1 inline" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        <Separator />

        {/* Search + Filters Row — only show for appointments view */}
        {viewMode === "appointments" && (
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
            <Input
              placeholder="Search patient name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Provider Filter */}
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-full sm:w-48 h-9">
              <SelectValue placeholder="All Providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}{p.credentials ? `, ${p.credentials}` : ""}
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
        )}
      </div>

      {/* Results Count — only show for appointments view */}
      {viewMode === "appointments" && (
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? (
            "Loading..."
          ) : (
            <>
              <span className="font-medium text-foreground">{total}</span> appointment{total !== 1 ? "s" : ""} found
            </>
          )}
        </p>
        {(statusFilter || search || providerFilter || dateFrom !== format(new Date(), "yyyy-MM-dd") || dateTo !== format(addDays(new Date(), 30), "yyyy-MM-dd")) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setSearch("");
              setProviderFilter("");
              setDateFrom(format(new Date(), "yyyy-MM-dd"));
              setDateTo(format(addDays(new Date(), 30), "yyyy-MM-dd"));
            }}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium cursor-pointer flex items-center gap-1"
          >
            <Filter className="size-3" />
            Clear filters
          </button>
        )}
        <button
          onClick={() => setViewMode("waitlist")}
          className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 font-medium cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors"
        >
          <Plus className="size-3" />
          Add to Waitlist
        </button>
      </div>
      )}

      {/* ================================================================== */}
      {/* WAITLIST VIEW                                                       */}
      {/* ================================================================== */}
      {viewMode === "waitlist" ? (
        <div className="bg-background rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b border-border/60">
                <TableHead className="py-3 px-4 whitespace-nowrap">Joined</TableHead>
                <TableHead className="py-3 px-4 whitespace-nowrap">Patient</TableHead>
                <TableHead className="py-3 px-4 whitespace-nowrap hidden md:table-cell">Provider</TableHead>
                <TableHead className="py-3 px-4 whitespace-nowrap hidden lg:table-cell">Specialty</TableHead>
                <TableHead className="py-3 px-4 whitespace-nowrap">Status</TableHead>
                <TableHead className="py-3 px-4 whitespace-nowrap hidden sm:table-cell">Contacts</TableHead>
                <TableHead className="text-right py-3 px-4 whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waitlistLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-border/30">
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="py-3 px-4 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="py-3 px-4 hidden sm:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : waitlistError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <p className="text-sm text-red-500 dark:text-red-400">{waitlistError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchWaitlist}
                      className="mt-2"
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : waitlistEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <EmptyState icon={Bell} title="No waitlist entries" description="Patients will appear here when they join the waitlist" />
                  </TableCell>
                </TableRow>
              ) : (
                waitlistEntries.map((entry, index) => (
                  <TableRow
                    key={entry.id}
                    className={`border-b border-border/30 transition-colors hover:bg-amber-50/30 dark:hover:bg-amber-950/20 ${
                      index % 2 === 0 ? "bg-background" : "bg-muted/15"
                    }`}
                  >
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(entry.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      {entry.expiresAt && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Expires: {format(parseISO(entry.expiresAt), "MMM d")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                          <User className="size-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{entry.patientName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {entry.patientEmail}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 hidden md:table-cell whitespace-nowrap">
                        <span className="text-sm">{entry.providerName}</span>
                      </TableCell>
                      <TableCell className="py-3 px-4 hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                        {entry.specialtyName}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge className={`${WL_STATUS_STYLES[entry.status] || WL_STATUS_STYLES.WAITING} border`}>
                          {WL_STATUS_LABELS[entry.status] || entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {entry.contactCount}
                        </span>
                        {entry.lastContactAt && (
                          <p className="text-[10px] text-muted-foreground/60">
                            Last: {format(parseISO(entry.lastContactAt), "MMM d")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={waitlistActionId === entry.id}
                            >
                              {waitlistActionId === entry.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="size-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {entry.status === "ACTIVE" && (
                              <DropdownMenuItem
                                onClick={() => handleWaitlistAction(entry.id, "OFFERED")}
                                className="cursor-pointer"
                              >
                                <CheckCircle2 className="size-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
                                Mark as Offered
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleWaitlistAction(entry.id, "contact")}
                              className="cursor-pointer"
                            >
                              <Phone className="size-3.5 mr-2 text-amber-600 dark:text-amber-400" />
                              Record Contact
                            </DropdownMenuItem>
                            {(entry.status === "ACTIVE" || entry.status === "OFFERED") && (
                              <DropdownMenuSeparator />
                            )}
                            {(entry.status === "ACTIVE" || entry.status === "OFFERED") && (
                              <DropdownMenuItem
                                onClick={() => handleWaitlistAction(entry.id, "EXPIRED")}
                                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                              >
                                <XCircle className="size-3.5 mr-2" />
                                Mark as Expired
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
      ) : (
      <div className="bg-background rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-b border-border/60">
              <TableHead className="py-3 px-4 whitespace-nowrap">Time</TableHead>
              <TableHead className="py-3 px-4 whitespace-nowrap">Patient</TableHead>
              <TableHead className="py-3 px-4 whitespace-nowrap hidden md:table-cell">Provider</TableHead>
              <TableHead className="py-3 px-4 whitespace-nowrap hidden lg:table-cell">Service</TableHead>
              <TableHead className="py-3 px-4 whitespace-nowrap hidden sm:table-cell">Modality</TableHead>
              <TableHead className="py-3 px-4 whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right py-3 px-4 whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/30">
                  <TableCell className="py-3 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="py-3 px-4 hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="py-3 px-4 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-3 px-4 hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAppointments}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                    <EmptyState icon={Calendar} title="No appointments found" description={statusFilter || search || providerFilter ? "Try adjusting your filters" : "No upcoming appointments in this date range. Try expanding the date range or check past dates."} />
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((apt, index) => (
                <TableRow
                  key={apt.id}
                  className={`border-b border-border/30 transition-colors hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 ${
                    index % 2 === 0 ? "bg-background" : "bg-muted/15"
                    }`}
                  >
                  <TableCell className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDetail(apt.id)}
                        className="flex items-center gap-2 text-left cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors w-full"
                      >
                        <div className="size-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <User className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate flex items-center gap-1.5">
                            {apt.patientName}
                            {(() => {
                              const conflicts = getConflicts(apt);
                              if (conflicts.length === 0) return null;
                              return (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full font-medium"
                                  title={`Overlaps with ${conflicts.map(c => c.patientName).join(", ")}`}
                                >
                                  <AlertTriangle className="size-2.5" />
                                  {conflicts.length > 1 ? `${conflicts.length} conflicts` : "Overlap"}
                                </span>
                              );
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {apt.patientEmail}
                          </p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="py-3 px-4 hidden md:table-cell whitespace-nowrap">
                      <span className="text-sm">
                        Dr. {apt.provider.firstName} {apt.provider.lastName}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                      {apt.service.name}
                    </TableCell>
                    <TableCell className="py-3 px-4 hidden sm:table-cell">
                      <ModalityBadge modality={apt.modality} />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <StatusBadge status={apt.status} />
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={transitioningId === apt.id}
                          >
                            {transitioningId === apt.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="size-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openDetail(apt.id)} className="cursor-pointer">
                            <Eye className="size-3.5 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {apt.status === "BOOKED" && (
                            <DropdownMenuItem
                              onClick={() => handleTransition(apt.id, "CHECKED_IN", apt.patientName)}
                              className="cursor-pointer"
                            >
                              <UserCheck className="size-3.5 mr-2 text-amber-600 dark:text-amber-400" />
                              Check In
                            </DropdownMenuItem>
                          )}
                          {apt.status === "BOOKED" && (
                            <DropdownMenuItem
                              onClick={() => openReschedule(apt)}
                              className="cursor-pointer"
                            >
                              <RefreshCw className="size-3.5 mr-2 text-blue-600 dark:text-blue-400" />
                              Reschedule
                            </DropdownMenuItem>
                          )}
                          {apt.status === "CHECKED_IN" && (
                            <DropdownMenuItem
                              onClick={() => handleTransition(apt.id, "COMPLETED", apt.patientName)}
                              className="cursor-pointer"
                            >
                              <CheckCircle2 className="size-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
                              Complete
                            </DropdownMenuItem>
                          )}
                          {(apt.status === "BOOKED" || apt.status === "CHECKED_IN") && (
                            <DropdownMenuItem
                              onClick={() => handleTransition(apt.id, "CANCELLED", apt.patientName)}
                              className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            >
                              <XCircle className="size-3.5 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {apt.status === "BOOKED" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setQrAppointmentId(apt.id);
                                setQrPatientName(apt.patientName);
                              }}
                              className="cursor-pointer"
                            >
                              <QrCode className="size-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
                              QR Code
                            </DropdownMenuItem>
                          )}
                          {apt.status === "BOOKED" && (
                            <DropdownMenuItem
                              onClick={() => handleTransition(apt.id, "NO_SHOW", apt.patientName)}
                              className="cursor-pointer"
                            >
                              <UserX className="size-3.5 mr-2" />
                              Mark No Show
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="icon"
                    className={`size-8 ${pageNum === page ? "bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white" : ""}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ================================================================== */}
      {/* RESCHEDULE DIALOG                                                  */}
      {/* ================================================================== */}
      <Dialog
        open={!!rescheduleApt}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleApt(null);
            setRescheduleSlots([]);
            setRescheduleSelectedSlotId("");
            setRescheduleDate(undefined);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <RefreshCw className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription>
              Select a new provider, date, and time slot for this appointment.
            </DialogDescription>
          </DialogHeader>

          {rescheduleApt && (
            <div className="space-y-5">
              {/* Current appointment info */}
              <div className="rounded-lg bg-muted/50 border border-border/50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {rescheduleApt.patientName}
                  </span>
                  <StatusBadge status={rescheduleApt.status} />
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>
                    Current: {format(parseISO(rescheduleApt.startTime), "EEE, MMM d 'at' h:mm a")} — {format(parseISO(rescheduleApt.endTime), "h:mm a")}
                  </p>
                  <p>
                    Dr. {rescheduleApt.provider.firstName} {rescheduleApt.provider.lastName}
                    {rescheduleApt.provider.credentials && <span>, {rescheduleApt.provider.credentials}</span>}
                    {" · "}{rescheduleApt.service.name}
                  </p>
                </div>
              </div>

              {/* Provider selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Provider</Label>
                <Select value={rescheduleProviderId} onValueChange={handleRescheduleProviderChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        Dr. {p.firstName} {p.lastName}{p.credentials ? `, ${p.credentials}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date picker */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">New Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal",
                        !rescheduleDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {rescheduleDate ? format(rescheduleDate, "EEEE, MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={rescheduleDate}
                      onSelect={handleRescheduleDateChange}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Available slots */}
              {rescheduleDate && rescheduleProviderId && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Available Slots
                    {rescheduleSlotsLoading && (
                      <Loader2 className="inline size-3.5 ml-2 animate-spin text-muted-foreground" />
                    )}
                  </Label>
                  {rescheduleSlotsLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-lg" />
                      ))}
                    </div>
                  ) : rescheduleSlots.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
                      <Calendar className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No available slots for this date</p>
                      <p className="text-xs text-muted-foreground mt-1">Try selecting a different date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {rescheduleSlots.map((slot) => {
                        const isSelected = rescheduleSelectedSlotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setRescheduleSelectedSlotId(slot.id)}
                            className={cn(
                              "flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all cursor-pointer",
                              isSelected
                                ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500/20 dark:ring-emerald-400/20"
                                : "border-border/60 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-foreground"
                            )}
                          >
                            <span className="text-sm font-medium">
                              {format(parseISO(slot.startTime), "h:mm a")}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {slot.modality === "VIDEO" ? "📹 Video" : "🏢 In-Person"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Summary when slot selected */}
              {rescheduleSelectedSlotId && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">New Appointment Time</p>
                  {(() => {
                    const selectedSlot = rescheduleSlots.find((s) => s.id === rescheduleSelectedSlotId);
                    if (!selectedSlot) return null;
                    return (
                      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                        <span className="font-medium">
                          {format(parseISO(selectedSlot.startTime), "EEE, MMM d 'at' h:mm a")}
                        </span>
                        <ArrowRight className="size-3.5" />
                        <span>{format(parseISO(selectedSlot.endTime), "h:mm a")}</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRescheduleApt(null);
                    setRescheduleSlots([]);
                    setRescheduleSelectedSlotId("");
                  }}
                  disabled={rescheduleSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white"
                  disabled={!rescheduleSelectedSlotId || rescheduleSubmitting}
                  onClick={handleRescheduleConfirm}
                >
                  {rescheduleSubmitting ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4 mr-1.5" />
                  )}
                  Confirm Reschedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* CONFIRMATION DIALOG                                                */}
      {/* ================================================================== */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog?.newStatus === "CANCELLED" ? (
                <XCircle className="size-5 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              )}
              {confirmDialog?.newStatus === "CANCELLED"
                ? "Cancel Appointment"
                : confirmDialog?.newStatus === "CHECKED_IN"
                  ? "Check In Patient"
                  : confirmDialog?.newStatus === "COMPLETED"
                    ? "Mark Appointment Completed"
                    : confirmDialog?.newStatus === "NO_SHOW"
                      ? "Mark as No Show"
                      : `Change to ${confirmDialog?.newStatus}`}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.patientName
                ? `Confirm action for ${confirmDialog.patientName}`
                : "Are you sure you want to proceed?"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cancellation reason selector */}
            {confirmDialog?.newStatus === "CANCELLED" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cancellation Reason</Label>
                <Select value={confirmReason} onValueChange={setConfirmReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PATIENT_CANCELLED">Patient Cancelled</SelectItem>
                    <SelectItem value="CLINIC_CANCELLED">Clinic Cancelled</SelectItem>
                    <SelectItem value="DOUBLE_BOOKING">Double Booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDialog(null)}
                disabled={!!transitioningId}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 ${
 confirmDialog?.newStatus === "CANCELLED"
 ? "bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white"
 : confirmDialog?.newStatus === "CHECKED_IN"
 ? "bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white"
 : confirmDialog?.newStatus === "COMPLETED"
 ? "bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
 : "bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 text-white"
 }`}
                disabled={!!transitioningId}
                onClick={handleConfirmTransition}
              >
                {transitioningId ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="size-4 mr-1.5" />
                )}
                {confirmDialog?.newStatus === "CANCELLED"
                  ? "Cancel Appointment"
                  : confirmDialog?.newStatus === "CHECKED_IN"
                    ? "Check In"
                    : confirmDialog?.newStatus === "COMPLETED"
                      ? "Complete"
                      : confirmDialog?.newStatus === "NO_SHOW"
                        ? "Mark No Show"
                        : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* QR CODE DIALOG                                                     */}
      {/* ================================================================== */}
      <Dialog
        open={!!qrAppointmentId}
        onOpenChange={(open) => {
          if (!open) {
            setQrAppointmentId(null);
            setQrPatientName(undefined);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="size-5 text-emerald-600 dark:text-emerald-400" />
              Appointment QR Code
            </DialogTitle>
            <DialogDescription>
              {qrPatientName
                ? `QR code for ${qrPatientName}'s appointment`
                : "Scannable QR code for this appointment"}
            </DialogDescription>
          </DialogHeader>
          {qrAppointmentId && (
            <QrCodeDisplay
              appointmentId={qrAppointmentId}
              patientName={qrPatientName}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* DETAIL DIALOG                                                      */}
      {/* ================================================================== */}
      <Dialog
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setDetail(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {detailLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="grid grid-cols-2 gap-4 pt-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            </div>
          ) : detail ? (
            <>
              {/* Dialog Header */}
              <div className="px-6 pt-6 pb-4 border-b border-border/40">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold">
                      Appointment Details
                    </DialogTitle>
                    <StatusBadge status={detail.status} />
                  </div>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {format(parseISO(detail.startTime), "EEEE, MMMM d, yyyy 'at' h:mm a")} —{" "}
                    {format(parseISO(detail.endTime), "h:mm a")}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-6 py-4 space-y-5">
                {/* Status Transition Buttons */}
                {detail.validTransitions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {detail.validTransitions.map((t) => (
                      <Button
                        key={t}
                        variant="outline"
                        size="sm"
                        className={`transition-all ${
  t === "CANCELLED"
  ? "border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300"
  : t === "COMPLETED"
  ? "border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300"
  : t === "CHECKED_IN"
  ? "border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300"
  : ""
 }`}
                        disabled={transitioningId === detail.id}
                        onClick={() => handleTransition(detail.id, t, detail.patientName)}
                      >
                        {transitioningId === detail.id ? (
                          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                        ) : (
                          TRANSITION_ICONS[t] || null
                        )}
                        {TRANSITION_LABELS[t] || t}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Patient Info Card */}
                  <div className="rounded-lg border border-border/60 p-4 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <User className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Patient</p>
                          <p className="text-xs text-muted-foreground">
                            {detail.patientType === "PEDIATRIC" ? (
                              <span className="flex items-center gap-1">
                                <Baby className="size-3" /> Pediatric
                              </span>
                            ) : (
                              "Adult"
                            )}
                          </p>
                        </div>
                      </div>
                      {!editingPatient ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300"
                          onClick={() => setEditingPatient(true)}
                          title="Edit patient details"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => {
                            setEditingPatient(false);
                            setEditName(detail.patientName);
                            setEditEmail(detail.patientEmail);
                            setEditPhone(detail.patientPhone);
                            setEditInsuranceVerified(detail.insuranceVerified ?? false);
                          }}
                        >
                          <X className="size-3 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>

                    {editingPatient ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-patient-name" className="text-xs font-medium text-muted-foreground">
                            Full Name
                          </Label>
                          <Input
                            id="edit-patient-name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-9 text-sm"
                            disabled={patientSaving}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-patient-phone" className="text-xs font-medium text-muted-foreground">
                            Phone
                          </Label>
                          <Input
                            id="edit-patient-phone"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="h-9 text-sm"
                            disabled={patientSaving}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-patient-email" className="text-xs font-medium text-muted-foreground">
                            Email
                          </Label>
                          <Input
                            id="edit-patient-email"
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="h-9 text-sm"
                            disabled={patientSaving}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
                          disabled={patientSaving || !editName.trim() || !editEmail.trim()}
                          onClick={handleSavePatient}
                        >
                          {patientSaving ? (
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5 mr-1.5" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="size-3.5 shrink-0" />
                          <a href={`tel:${detail.patientPhone}`} className="hover:text-foreground transition-colors">
                            {detail.patientPhone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="size-3.5 shrink-0" />
                          <a href={`mailto:${detail.patientEmail}`} className="hover:text-foreground transition-colors truncate">
                            {detail.patientEmail}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="size-3.5 shrink-0" />
                          <span>DOB: {format(parseISO(detail.patientDob), "MMM d, yyyy")}</span>
                        </div>
                        {detail.guardianName && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="size-3.5 shrink-0" />
                            <span>
                              Guardian: {detail.guardianName} ({detail.guardianRelation})
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Insurance Info Received checkbox (always visible) */}
                    <Separator />
                    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                      <Checkbox
                        checked={editingPatient ? editInsuranceVerified : (detail.insuranceVerified ?? false)}
                        onCheckedChange={(checked) => {
                          const val = checked === true;
                          if (editingPatient) {
                            setEditInsuranceVerified(val);
                          } else {
                            // Quick-toggle without entering full edit mode
                            if (!selectedId) return;
                            fetch(`/api/staff/appointments/${selectedId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ insuranceVerified: val }),
                            })
                              .then((res) => {
                                if (res.ok) {
                                  setDetail((prev) => prev ? { ...prev, insuranceVerified: val } : null);
                                  toast.success(val ? "Insurance info marked as received" : "Insurance info mark removed");
                                } else {
                                  toast.error("Failed to update");
                                }
                              })
                              .catch(() => toast.error("Failed to update"));
                          }
                        }}
                        disabled={patientSaving}
                        className="data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-600 dark:data-[state=checked]:border-emerald-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          Insurance Info Received
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          Confirm that the patient&apos;s insurance card/information has been received
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Appointment Info Card */}
                  <div className="rounded-lg border border-border/60 p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Appointment Info</p>
                        <p className="text-xs text-muted-foreground">{detail.service.name}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserCheck className="size-3.5 shrink-0" />
                        <span>
                          Dr. {detail.provider.firstName} {detail.provider.lastName}
                          {detail.provider.credentials ? `, ${detail.provider.credentials}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="size-3.5 shrink-0" />
                        <span>Specialty: {detail.specialty.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ModalityBadge modality={detail.modality} />
                        {detail.intakeCompleted && (
                          <Badge variant="outline" className="border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[10px]">
                            <CheckCircle2 className="size-2.5 mr-0.5" /> Intake Done
                          </Badge>
                        )}
                      </div>
                      {detail.modality === "VIDEO" && (detail.provider as Record<string, unknown>)?.videoVisitLink && (
                        <div className="flex items-center gap-2 pt-1">
                          <Video className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <a
                            href={(detail.provider as Record<string, unknown>).videoVisitLink as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 inline-flex items-center gap-1"
                          >
                            Join Telehealth Visit
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      )}
                      <p className="text-muted-foreground pt-1">
                        <span className="font-medium">Reason:</span> {detail.reasonForVisit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Insurance Info */}
                <div className="rounded-lg border border-border/60 p-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Shield className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Insurance
                  </h4>
                  {detail.insurance ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{detail.insurance.name}</p>
                        {detail.isDemoInsurance && (
                          <Badge variant="outline" className="mt-1 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[10px]">
                            Demo Plan
                          </Badge>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        {detail.isDemoInsurance ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Free</span>
                        ) : detail.depositCents > 0 ? (
                          <div>
                            <p className="text-muted-foreground">Deposit: {formatCents(detail.depositCents)}</p>
                            {detail.selfPayCents > 0 && (
                              <p className="text-muted-foreground">Self-pay: {formatCents(detail.selfPayCents)}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No insurance on file</p>
                  )}
                </div>

                {/* Financial / Ledger */}
                {detail.ledger && (
                  <div className="rounded-lg border border-border/60 p-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CreditCard className="size-4 text-emerald-600 dark:text-emerald-400" />
                      Financial Info
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Payment Method</p>
                        <p className="font-medium capitalize">
                          {detail.paymentMethod?.replace(/_/g, " ") || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment Status</p>
                        <Badge variant="outline" className="text-[10px]">
                          {detail.paymentStatus}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Deposit</p>
                        <p className="font-medium">{formatCents(detail.depositCents)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Self-pay Total</p>
                        <p className="font-medium">{formatCents(detail.selfPayCents)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ledger Type</p>
                        <p className="font-medium">{detail.ledger.type.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ledger Amount</p>
                        <p className="font-medium">{formatCents(detail.ledger.amountCents)}</p>
                      </div>
                      {detail.ledger.description && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Note</p>
                          <p className="text-xs">{detail.ledger.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Patient Token */}
                {detail.tokens.length > 0 && (
                  <div className="rounded-lg border border-border/60 p-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Hash className="size-4 text-emerald-600 dark:text-emerald-400" />
                      Patient Management Token
                    </h4>
                    <div className="space-y-1.5">
                      {detail.tokens.map((token) => (
                        <div
                          key={token.id}
                          className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {token.purpose}
                            </Badge>
                            <span className="text-muted-foreground">
                              {token.consumedAt ? "Consumed" : token.expiresAt < new Date().toISOString() ? "Expired" : "Active"}
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            Expires: {format(parseISO(token.expiresAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancellation Info */}
                {detail.status === "CANCELLED" && detail.cancellationReason && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4">
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-2">
                      <XCircle className="size-4" />
                      Cancellation Details
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Reason: {detail.cancellationReason.replace(/_/g, " ")}
                    </p>
                    {detail.cancelledAt && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        Cancelled: {format(parseISO(detail.cancelledAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </div>
                )}

                {/* Internal Notes */}
                <div className="rounded-lg border border-border/60 p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <StickyNote className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Internal Notes
                    {detail.notes.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] ml-1">
                        {detail.notes.length}
                      </Badge>
                    )}
                  </h4>

                  <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
                    {detail.notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No notes yet. Add one below.
                      </p>
                    ) : (
                      detail.notes.map((note) => (
                        <div key={note.id} className="flex gap-2.5">
                          {/* Author avatar */}
                          <div className="shrink-0 mt-0.5">
                            <div className="size-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                              {note.author?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          </div>
                          {/* Note bubble */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-medium">
                                {note.author?.name || "Unknown"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(parseISO(note.createdAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 mt-0.5 bg-muted/40 rounded-lg px-3 py-2">
                              {note.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Note Form */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add an internal note..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="min-h-[60px] text-sm flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handleAddNote();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="size-9 shrink-0 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white self-end"
                      disabled={!noteContent.trim() || noteSubmitting}
                      onClick={handleAddNote}
                    >
                      {noteSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Created Info */}
                <div className="text-xs text-muted-foreground text-right">
                  Created: {format(parseISO(detail.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  {detail.id && (
                    <span className="ml-2 font-mono text-[10px]">
                      ID: {detail.id.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              Could not load appointment details.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}