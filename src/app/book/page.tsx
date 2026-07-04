"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Heart,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Baby,
  Shield,
  Copy,
  ExternalLink,
  Search,
  MapPin,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { PATIENT_TYPE, SLOT_MODALITY } from "@/lib/enums";

// =============================================================================
// Types
// =============================================================================

interface SlotData {
  slot: {
    id: string;
    startTime: string;
    endTime: string;
    modality: string;
    status: string;
  };
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    credentials: string | null;
    slug: string;
    clinicId: string;
  };
  clinic: {
    id: string;
    name: string;
    slug: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    phoneNumber: string;
    selfPayFlatRateCents: number | null;
    inPersonDepositCents: number | null;
    videoDepositCents: number | null;
  };
  specialty: { id: string; name: string } | null;
  serviceId: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

function formatSlotTime(startTime: string): string {
  return format(new Date(startTime), "EEEE, MMMM d, yyyy · h:mm a");
}

function ModalityBadge({ modality }: { modality: string }) {
  const isVideo = modality === SLOT_MODALITY.VIDEO;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
        isVideo
          ? "bg-blue-100 text-blue-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {isVideo ? "Video" : "In-Clinic"}
    </span>
  );
}

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return name;
  return parts
    .map((part) => {
      if (part.length <= 2) return part[0] + "**";
      return part[0] + "*".repeat(part.length - 2) + part[part.length - 1];
    })
    .join(" ");
}

function formatCents(cents: number | null): string {
  if (cents == null || cents === 0) return "No payment required";
  return `$${(cents / 100).toFixed(2)}`;
}

function getTodayDateString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

// =============================================================================
// Progress Indicator
// =============================================================================

const STEP_LABELS = [
  "Visit Details",
  "Your Info",
  "Review & Confirm",
  "Confirmation",
];

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const isFuture = stepNum > currentStep;

          return (
            <div key={stepNum} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex items-center justify-center size-8 rounded-full text-sm font-semibold transition-colors duration-300 ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isActive
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="size-4" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`text-[11px] sm:text-xs text-center leading-tight max-w-[72px] ${
                    isActive
                      ? "text-emerald-700 font-medium"
                      : isCompleted
                      ? "text-emerald-600 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {stepNum}. {label}
                </span>
              </div>

              {/* Connector line */}
              {idx < STEP_LABELS.length - 1 && (
                <div className="flex-1 mx-2 mt-[-18px]">
                  <div
                    className={`h-0.5 rounded-full transition-colors duration-300 ${
                      stepNum < currentStep
                        ? "bg-emerald-600"
                        : "bg-gray-200"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Booking Wizard Page
// =============================================================================

export default function BookingPage() {
  const searchParams = useSearchParams();
  const providerId = searchParams.get("providerId") ?? "";
  const slotId = searchParams.get("slotId") ?? "";
  const urlSpecialtyId = searchParams.get("specialtyId") ?? "";

  // ---- Core State ----
  const [step, setStep] = useState(1);
  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Step 1 State ----
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [patientType, setPatientType] = useState<"ADULT" | "PEDIATRIC">(
    (searchParams.get("patientType") as "ADULT" | "PEDIATRIC") || "ADULT"
  );
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);

  // ---- Step 2 State ----
  const [patientName, setPatientName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");

  // ---- Step 3 State ----
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const lockKeyRef = useRef<string>(crypto.randomUUID());

  // ---- Step 4 State ----
  const [appointmentResult, setAppointmentResult] = useState<{
    id: string;
    startTime: string;
    patientName: string;
    clinicName: string;
    providerName: string;
    providerCredentials?: string;
  } | null>(null);
  const [rawToken, setRawToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  // ---- Derived values ----
  const specialtyId = useMemo(() => {
    if (urlSpecialtyId) return urlSpecialtyId;
    return slotData?.specialty?.id ?? "";
  }, [urlSpecialtyId, slotData]);

  const serviceId = useMemo(() => {
    return slotData?.serviceId ?? "";
  }, [slotData]);

  const depositCents = useMemo(() => {
    if (!slotData) return 0;
    if (slotData.slot.modality === SLOT_MODALITY.VIDEO) {
      return slotData.clinic.videoDepositCents ?? 0;
    }
    return slotData.clinic.inPersonDepositCents ?? 0;
  }, [slotData]);

  const depositDisplay = useMemo(() => formatCents(depositCents), [depositCents]);

  // ---- Fetch slot data on mount ----
  useEffect(() => {
    if (!slotId) {
      setError("No slot ID provided. Please select a time slot from the search page.");
      setLoading(false);
      return;
    }

    async function fetchSlot() {
      try {
        const res = await fetch(`/api/slots/${slotId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed to load slot (${res.status})`);
        }
        const data: SlotData = await res.json();
        setSlotData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load appointment details.");
      } finally {
        setLoading(false);
      }
    }
    fetchSlot();
  }, [slotId]);

  // ---- Validation helpers ----
  const validateStep1 = useCallback((): boolean => {
    if (!reasonForVisit.trim()) return false;
    if (patientType === "PEDIATRIC") {
      if (!guardianName.trim() || !guardianRelation || !guardianConfirmed) return false;
    }
    return true;
  }, [reasonForVisit, patientType, guardianName, guardianRelation, guardianConfirmed]);

  const validateStep2 = useCallback((): boolean => {
    if (!patientName.trim()) return false;
    if (!patientDob) return false;
    if (!patientPhone.trim()) return false;
    if (!patientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) return false;
    return true;
  }, [patientName, patientDob, patientPhone, patientEmail]);

  // ---- Step navigation ----
  const goNext = () => {
    setStepError(null);
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const goBack = () => {
    setStepError(null);
    if (step > 1 && step < 4) setStep(step - 1);
  };

  // ---- Release lock helper ----
  const releaseLock = useCallback(async () => {
    try {
      await fetch(`/api/slots/${slotId}/lock?lockKey=${encodeURIComponent(lockKeyRef.current)}`, {
        method: "DELETE",
      });
    } catch {
      // Silently fail — lock will expire via TTL
    }
  }, [slotId]);

  // ---- Submit appointment ----
  const handleConfirm = useCallback(async () => {
    if (!agreed) {
      setStepError("Please agree to the cancellation policy to proceed.");
      return;
    }
    if (!slotData || !specialtyId || !serviceId) {
      setStepError("Missing required booking data. Please go back and try again.");
      return;
    }

    setIsSubmitting(true);
    setStepError(null);
    const lockKey = lockKeyRef.current;

    try {
      // 1. Lock the slot
      const lockRes = await fetch(`/api/slots/${slotId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockKey }),
      });

      if (!lockRes.ok) {
        const lockBody = await lockRes.json().catch(() => ({}));
        if (lockRes.status === 409 && lockBody.code === "SLOT_TAKEN") {
          setStepError("This time slot was just booked by someone else.");
          return;
        }
        throw new Error(lockBody.error ?? `Failed to lock slot (${lockRes.status})`);
      }

      // 2. Create appointment
      const appointmentBody = {
        slotId,
        lockKey,
        patientName: patientName.trim(),
        patientDob,
        patientPhone: patientPhone.trim(),
        patientEmail: patientEmail.trim(),
        patientType,
        reasonForVisit: reasonForVisit.trim(),
        specialtyId,
        serviceId,
        guardianName: patientType === "PEDIATRIC" ? guardianName.trim() : undefined,
        guardianRelation: patientType === "PEDIATRIC" ? guardianRelation : undefined,
        paymentMethod: "MANUAL_WAIVER" as const,
        depositCents: 0,
        selfPayCents: 0,
        isDemoInsurance: false,
      };

      const apptRes = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentBody),
      });

      if (!apptRes.ok) {
        const apptBody = await apptRes.json().catch(() => ({}));
        // Release lock on failure
        await releaseLock();
        if (apptRes.status === 409 && apptBody.code === "SLOT_TAKEN") {
          setStepError("This time slot was just booked by someone else.");
          return;
        }
        throw new Error(apptBody.error ?? `Failed to create appointment (${apptRes.status})`);
      }

      const apptData = await apptRes.json();
      setRawToken(apptData.token);
      setAppointmentResult(apptData.appointment);
      setStep(4);
    } catch (err) {
      await releaseLock();
      setStepError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    agreed,
    slotData,
    specialtyId,
    serviceId,
    slotId,
    patientName,
    patientDob,
    patientPhone,
    patientEmail,
    patientType,
    reasonForVisit,
    guardianName,
    guardianRelation,
    releaseLock,
  ]);

  // ---- Copy token ----
  const handleCopyToken = useCallback(async () => {
    const tokenUrl = `${window.location.origin}/manage/${rawToken}`;
    try {
      await navigator.clipboard.writeText(tokenUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = tokenUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [rawToken]);

  // ---- Provider display name ----
  const providerDisplayName = useMemo(() => {
    if (!slotData) return "";
    const name = `${slotData.provider.firstName} ${slotData.provider.lastName}`;
    return slotData.provider.credentials
      ? `Dr. ${name}, ${slotData.provider.credentials}`
      : `Dr. ${name}`;
  }, [slotData]);

  const clinicAddress = useMemo(() => {
    if (!slotData) return "";
    return [
      slotData.clinic.streetAddress,
      slotData.clinic.city,
      slotData.clinic.state,
      slotData.clinic.zipCode,
    ]
      .filter(Boolean)
      .join(", ");
  }, [slotData]);

  // ===========================================================================
  // Loading State
  // ===========================================================================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer">
              <Heart className="size-6 text-emerald-600 fill-emerald-600" />
              <span className="text-lg font-bold tracking-tight text-foreground">
                ClinicBook
              </span>
            </div>
            <Button variant="outline" size="sm" className="cursor-pointer">
              Staff Login
            </Button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Error State
  // ===========================================================================
  if (error || !slotData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer">
              <Heart className="size-6 text-emerald-600 fill-emerald-600" />
              <span className="text-lg font-bold tracking-tight text-foreground">
                ClinicBook
              </span>
            </div>
            <Button variant="outline" size="sm" className="cursor-pointer">
              Staff Login
            </Button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="flex flex-col items-center text-center space-y-4 max-w-md">
            <AlertCircle className="size-10 text-destructive" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Unable to load appointment</p>
              <p className="text-sm text-muted-foreground">{error || "Slot data not found."}</p>
            </div>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
              <Link href="/">
                <Search className="size-4" />
                Back to Search
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Step 4 — Confirmation (separate layout, no progress bar needed)
  // ===========================================================================
  if (step === 4 && appointmentResult) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer">
              <Heart className="size-6 text-emerald-600 fill-emerald-600" />
              <span className="text-lg font-bold tracking-tight text-foreground">
                ClinicBook
              </span>
            </div>
            <Button variant="outline" size="sm" className="cursor-pointer">
              Staff Login
            </Button>
          </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 space-y-6">
          {/* Success Icon */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Appointment Confirmed!
            </h1>
            <p className="text-muted-foreground max-w-md">
              Your appointment has been booked successfully. Check your email for a confirmation.
            </p>
          </div>

          {/* Appointment Details Card */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{formatSlotTime(appointmentResult.startTime)}</p>
                  <div className="mt-1">
                    <ModalityBadge modality={slotData.slot.modality} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <User className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{appointmentResult.providerName}</p>
                  {appointmentResult.providerCredentials && (
                    <p className="text-xs text-muted-foreground">{appointmentResult.providerCredentials}</p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Building2 className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{appointmentResult.clinicName}</p>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Shield className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Patient: <span className="font-medium text-foreground">{maskName(appointmentResult.patientName)}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Token Management */}
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Shield className="size-4 text-emerald-600" />
                Manage Your Appointment
              </h3>
              <p className="text-sm text-muted-foreground">
                Save this link! You&apos;ll need it to view details, complete intake forms, or make changes.
              </p>

              <Button
                variant="outline"
                onClick={() => setShowToken(!showToken)}
                className="w-full cursor-pointer justify-center"
              >
                {showToken ? (
                  <>
                    <EyeOff className="size-4" />
                    Hide Token Link
                  </>
                ) : (
                  <>
                    <Eye className="size-4" />
                    Show Token Link
                  </>
                )}
              </Button>

              {showToken && rawToken && (
                <div className="rounded-lg border bg-white p-3 space-y-2">
                  <p className="text-xs text-muted-foreground break-all font-mono">
                    {window.location.origin}/manage/{rawToken}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToken}
                    className="w-full cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Back to Search */}
          <div className="flex justify-center pt-2">
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/">
                <Search className="size-4" />
                Back to Search
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ===========================================================================
  // Steps 1-3 — Wizard with Progress Bar
  // ===========================================================================
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ===== Sticky Header ===== */}
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer">
            <Heart className="size-6 text-emerald-600 fill-emerald-600" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              ClinicBook
            </span>
          </div>
          <Button variant="outline" size="sm" className="cursor-pointer">
            Staff Login
          </Button>
        </div>
      </header>

      {/* ===== Progress Indicator ===== */}
      <div className="bg-white border-b">
        <ProgressIndicator currentStep={step} />
      </div>

      {/* ===== Step Content ===== */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* ---- Step 1: Visit Details ---- */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-2xl font-bold text-foreground">What brings you in?</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Tell us about your visit so the provider can prepare.
              </p>
            </div>

            <Card>
              <CardContent className="p-5 space-y-5">
                {/* Reason for Visit */}
                <div className="space-y-2">
                  <Label htmlFor="reasonForVisit" className="text-sm font-medium">
                    Reason for Visit <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reasonForVisit"
                    placeholder="e.g., Annual physical, persistent headache, follow-up for lab results..."
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Separator />

                {/* Patient Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Patient Type <span className="text-destructive">*</span>
                  </Label>
                  <ToggleGroup
                    type="single"
                    value={patientType}
                    onValueChange={(val) => {
                      if (val) setPatientType(val as "ADULT" | "PEDIATRIC");
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <ToggleGroupItem
                      value="ADULT"
                      className="flex-1 gap-1.5 cursor-pointer"
                    >
                      <User className="size-3.5" />
                      <span className="text-xs sm:text-sm">Adult</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="PEDIATRIC"
                      className="flex-1 gap-1.5 cursor-pointer"
                    >
                      <Baby className="size-3.5" />
                      <span className="text-xs sm:text-sm">Pediatric</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Guardian Fields (Pediatric) */}
                {patientType === "PEDIATRIC" && (
                  <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                      <Shield className="size-4" />
                      Guardian Information Required
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guardianName" className="text-sm">
                        Guardian Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="guardianName"
                        placeholder="Jane Smith"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guardianRelation" className="text-sm">
                        Relationship to Patient <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={guardianRelation}
                        onValueChange={setGuardianRelation}
                      >
                        <SelectTrigger id="guardianRelation" className="cursor-pointer">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mother" className="cursor-pointer">Mother</SelectItem>
                          <SelectItem value="Father" className="cursor-pointer">Father</SelectItem>
                          <SelectItem value="Legal Guardian" className="cursor-pointer">Legal Guardian</SelectItem>
                          <SelectItem value="Other" className="cursor-pointer">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-start gap-2.5 pt-1">
                      <Checkbox
                        id="guardianConfirmed"
                        checked={guardianConfirmed}
                        onCheckedChange={(checked) => setGuardianConfirmed(checked === true)}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="guardianConfirmed"
                        className="text-sm leading-snug cursor-pointer"
                      >
                        I confirm I have legal authority to consent for this minor&apos;s treatment
                      </Label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ---- Step 2: Your Information ---- */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Information</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                No account needed — we&apos;ll only use this for your appointment.
              </p>
            </div>

            <Card>
              <CardContent className="p-5 space-y-4">
                {/* Patient Name */}
                <div className="space-y-2">
                  <Label htmlFor="patientName" className="text-sm font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patientName"
                    placeholder="John Doe"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="patientDob" className="text-sm font-medium">
                    Date of Birth <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patientDob"
                    type="date"
                    max={getTodayDateString()}
                    value={patientDob}
                    onChange={(e) => setPatientDob(e.target.value)}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="patientPhone" className="text-sm font-medium">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patientPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="patientEmail" className="text-sm font-medium">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patientEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ---- Step 3: Review & Confirm ---- */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Review & Confirm</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Please review the details below before confirming your appointment.
              </p>
            </div>

            {/* Appointment Summary Card */}
            <Card>
              <CardContent className="p-5 space-y-3">
                {/* Provider */}
                <div className="flex items-start gap-3">
                  <User className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{providerDisplayName}</p>
                    {slotData.specialty && (
                      <p className="text-xs text-muted-foreground">{slotData.specialty.name}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Clinic */}
                <div className="flex items-start gap-3">
                  <Building2 className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{slotData.clinic.name}</p>
                    <p className="text-xs text-muted-foreground">{clinicAddress}</p>
                  </div>
                </div>

                <Separator />

                {/* Date / Time / Modality */}
                <div className="flex items-start gap-3">
                  <Calendar className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm">{formatSlotTime(slotData.slot.startTime)}</p>
                    <ModalityBadge modality={slotData.slot.modality} />
                  </div>
                </div>

                <Separator />

                {/* Patient Type */}
                <div className="flex items-center gap-3">
                  {patientType === "PEDIATRIC" ? (
                    <Baby className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <User className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <p className="text-sm">
                    <span className="text-muted-foreground">Patient Type:</span>{" "}
                    <span className="font-medium">
                      {patientType === "PEDIATRIC" ? "Pediatric" : "Adult"}
                    </span>
                  </p>
                </div>

                {/* Guardian info (pediatric) */}
                {patientType === "PEDIATRIC" && (
                  <>
                    <div className="flex items-center gap-3 pl-7">
                      <Shield className="size-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Guardian: <span className="font-medium text-foreground">{guardianName}</span> ({guardianRelation})
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Reason */}
                <div className="flex items-start gap-3">
                  <AlertCircle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Reason:</span>{" "}
                    {reasonForVisit.length > 120
                      ? reasonForVisit.slice(0, 120) + "..."
                      : reasonForVisit}
                  </p>
                </div>

                <Separator />

                {/* Patient Name (masked) */}
                <div className="flex items-center gap-3">
                  <Shield className="size-4 text-muted-foreground shrink-0" />
                  <p className="text-sm">
                    <span className="text-muted-foreground">Patient:</span>{" "}
                    <span className="font-medium">{maskName(patientName)}</span>
                  </p>
                </div>

                <Separator />

                {/* Cost */}
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-muted-foreground shrink-0" />
                  <p className="text-sm">
                    <span className="text-muted-foreground">Cost:</span>{" "}
                    <span className="font-medium">{depositDisplay}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Agreement */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="agreement"
                    checked={agreed}
                    onCheckedChange={(checked) => {
                      setAgreed(checked === true);
                      if (stepError) setStepError(null);
                    }}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="agreement"
                    className="text-sm leading-snug cursor-pointer"
                  >
                    I agree to the cancellation policy. Appointments must be
                    cancelled at least 24 hours in advance.
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  By proceeding, you agree to our terms. {depositCents > 0 ? `A ${depositDisplay} deposit may be required.` : "No payment is required for this booking."}
                </p>
              </CardContent>
            </Card>

            {/* Step Error */}
            {stepError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <div className="flex-1">
                  <p>{stepError}</p>
                  {stepError.includes("booked by someone else") && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Link href="/">
                        <Search className="size-3.5" />
                        Search for Another Time
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || !agreed}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Confirm Appointment
                </>
              )}
            </Button>
          </div>
        )}
      </main>

      {/* ===== Navigation Footer (Steps 1-3 only) ===== */}
      {step >= 1 && step <= 3 && (
        <div className="border-t bg-white sticky bottom-0">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={step === 1}
              className="cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>

            {step < 3 ? (
              <Button
                onClick={goNext}
                disabled={
                  (step === 1 && !validateStep1()) ||
                  (step === 2 && !validateStep2())
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <div className="w-[88px]" /> // Spacer to balance the back button
            )}
          </div>
        </div>
      )}
    </div>
  );
}