"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Briefcase, Shield, Loader2, Save, Search,
} from "lucide-react";
import { PageHeader } from "@/components/staff/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { DoctASessionUser } from "@/lib/auth";

interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  selfPayPriceCents: number;
  selfPayPaymentType: string;
  specialty: { name: string } | null;
}

interface InsuranceItem {
  id: string;
  name: string;
  slug: string;
  isDemo: boolean;
}

export default function ServicesPage() {
  const { data: session } = useSession();
  const user = session?.user as DoctASessionUser | undefined;
  const clinicId = user?.clinicId as string | undefined;

  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [assignedServiceIds, setAssignedServiceIds] = useState<Set<string>>(new Set());
  const [selfPayRateCents, setSelfPayRateCents] = useState(0);
  const [servicePaymentTypes, setServicePaymentTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Insurance
  const [allInsurances, setAllInsurances] = useState<InsuranceItem[]>([]);
  const [selectedInsuranceIds, setSelectedInsuranceIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [svcRes, insRes, clinicRes] = await Promise.all([
        fetch(`/api/staff/services?clinicId=${clinicId}`),
        fetch(`/api/staff/insurances?clinicId=${clinicId}`),
        fetch(`/api/staff/clinic-info?clinicId=${clinicId}`),
      ]);

      if (svcRes.ok) {
        const svcData = await svcRes.json();
        setAllServices(svcData.all || []);
        setAssignedServiceIds(new Set<string>(svcData.assignedServiceIds || []));
      }
      if (insRes.ok) {
        const insData = await insRes.json();
        setAllInsurances(insData.all || []);
        setSelectedInsuranceIds(new Set(insData.selected.map((i: InsuranceItem) => i.id)));
      }
      if (clinicRes.ok) {
        const clinicData = await clinicRes.json();
        setSelfPayRateCents(clinicData.selfPayFlatRateCents || 0);
      }

      // Load service payment types
      const paymentTypes: Record<string, string> = {};
      if (svcRes.ok) {
        const svcData = await svcRes.json();
        for (const svc of svcData.all || []) {
          paymentTypes[svc.id] = svc.selfPayPaymentType || "STANDARD_DEPOSIT";
        }
      }
      setServicePaymentTypes(paymentTypes);
    } catch {} finally { setLoading(false); }
  }, [clinicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleService = (id: string) => {
    setAssignedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleInsurance = (id: string) => {
    setSelectedInsuranceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSaveServices = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/services?clinicId=${clinicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: Array.from(assignedServiceIds),
          selfPayRateCents,
          servicePaymentTypes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save services");
      toast.success("Services updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save services");
    } finally { setSaving(false); }
  };

  const handleSaveInsurances = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/insurances?clinicId=${clinicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insuranceIds: Array.from(selectedInsuranceIds) }),
      });
      if (!res.ok) throw new Error("Failed to save insurances");
      toast.success("Insurances updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save insurances");
    } finally { setSaving(false); }
  };

  const filteredServices = allServices.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="space-y-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader title="Services" description="Configure services, self-pay rates, and accepted insurances" />

      {/* Self-Pay Flat Rate */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Self-Pay Flat Rate</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-3 max-w-xs">
            <Label htmlFor="selfPayRate" className="shrink-0">$</Label>
            <Input
              id="selfPayRate"
              type="number"
              min={0}
              value={(selfPayRateCents / 100).toFixed(0)}
              onChange={(e) => setSelfPayRateCents(Math.round(parseFloat(e.target.value || "0") * 100))}
            />
            <span className="text-xs text-muted-foreground">per visit</span>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveServices} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Assignment */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Briefcase className="size-4 text-emerald-600" />
              </div>
              <CardTitle className="text-base">Assigned Services</CardTitle>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveServices} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
              Save Services
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
            <Input placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredServices.map((svc) => {
              const isAssigned = assignedServiceIds.has(svc.id);
              return (
                <label
                  key={svc.id}
                  className={`rounded-xl border p-3 cursor-pointer transition-all ${
                    isAssigned ? "border-emerald-200 bg-emerald-50/50 shadow-sm" : "border-border/60 hover:border-emerald-200 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{svc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{svc.specialty?.name}</p>
                    </div>
                    <div className={`size-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      isAssigned ? "bg-emerald-600 border-emerald-600" : "border-muted-foreground/30"
                    }`}>
                      {isAssigned && <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{svc.durationMinutes} min</span>
                    {svc.selfPayPriceCents > 0 && <span>${(svc.selfPayPriceCents / 100).toFixed(2)}</span>}
                  </div>
                  {isAssigned && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={servicePaymentTypes[svc.id] || "STANDARD_DEPOSIT"}
                        onValueChange={(v) => setServicePaymentTypes((prev) => ({ ...prev, [svc.id]: v }))}
                      >
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STANDARD_DEPOSIT">Standard Deposit</SelectItem>
                          <SelectItem value="FULL_UPFRONT">Full Upfront</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    onChange={() => toggleService(svc.id)}
                    className="sr-only"
                  />
                </label>
              );
            })}
          </div>
          {filteredServices.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No services match your search.</p>
          )}
        </CardContent>
      </Card>

      {/* Insurance Assignment */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="size-4 text-blue-600" />
              </div>
              <CardTitle className="text-base">Accepted Insurances</CardTitle>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveInsurances} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5 mr-1" />}
              Save Insurances
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-wrap gap-2">
            {allInsurances.map((ins) => {
              const selected = selectedInsuranceIds.has(ins.id);
              return (
                <button
                  key={ins.id}
                  type="button"
                  onClick={() => toggleInsurance(ins.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                    selected
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-emerald-200 hover:text-foreground"
                  }`}
                >
                  {ins.name}
                  {ins.isDemo && <Badge variant="outline" className="ml-1.5 text-[9px] py-0 bg-emerald-50 text-emerald-600 border-emerald-200">Demo</Badge>}
                </button>
              );
            })}
            {allInsurances.length === 0 && <p className="text-sm text-muted-foreground">No insurances available.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
