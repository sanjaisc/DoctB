"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Building2, Users, Loader2, Search, ExternalLink, RefreshCw, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { StatusBadge } from "@/components/staff/status-badge";
import { EditClinicDialog } from "@/components/admin/edit-clinic-dialog";
import { EditProviderDialog } from "@/components/admin/edit-provider-dialog";
import { PageHeader } from "@/components/staff/PageHeader";
import { EmptyState } from "@/components/staff/empty-state";

interface ClinicRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: string;
  providerCount: number;
  todayAppts: number;
  weekAppts: number;
  avgRating: number;
}

interface ProviderRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  clinicId: string;
  clinicName: string;
  clinicSlug: string;
  serviceCount: number;
  appointmentCount: number;
}

const STATUS_OPTIONS = ["DRAFT", "PENDING", "PUBLISHED", "SUSPENDED", "ARCHIVED"];

export default function ClinicsPage() {
  const [activeTab, setActiveTab] = useState("clinics");
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicSearch, setClinicSearch] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [editClinic, setEditClinic] = useState<{ id: string; name: string } | null>(null);
  const [editProvider, setEditProvider] = useState<{ id: string; name: string } | null>(null);

  const fetchClinics = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/admin");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setClinics(json.clinicSummary || []);
    } catch {
      toast.error("Failed to load clinics");
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/admin/providers");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setProviders(json.data || []);
    } catch {
      toast.error("Failed to load providers");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchClinics(), fetchProviders()]).finally(() => setLoading(false));
  }, [fetchClinics, fetchProviders]);

  const handleStatusChange = async (clinicId: string, status: string) => {
    try {
      const res = await fetch(`/api/staff/admin/clinics/${clinicId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to change status");
      }
      toast.success(`Clinic status changed to ${status}`);
      fetchClinics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change status");
    }
  };

  const filteredClinics = clinics.filter((c) =>
    c.name.toLowerCase().includes(clinicSearch.toLowerCase()) ||
    c.city.toLowerCase().includes(clinicSearch.toLowerCase())
  );

  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
    p.clinicName.toLowerCase().includes(providerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Clinic & Provider Oversight"
        description="View and manage all clinics and providers across the platform."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="clinics" className="gap-1.5"><Building2 className="size-3.5" /> Clinics</TabsTrigger>
          <TabsTrigger value="providers" className="gap-1.5"><Users className="size-3.5" /> Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="clinics" className="pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
              <Input placeholder="Search clinics..." className="pl-9 h-9" value={clinicSearch} onChange={(e) => setClinicSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : filteredClinics.length === 0 ? (
            <EmptyState title="No clinics found." compact />
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b">
                    <TableHead className="px-4 py-2.5">Clinic</TableHead>
                    <TableHead className="px-4 py-2.5 hidden md:table-cell">City</TableHead>
                    <TableHead className="text-center px-3 py-2.5">Status</TableHead>
                    <TableHead className="text-center px-3 py-2.5 hidden lg:table-cell">Providers</TableHead>
                    <TableHead className="text-center px-3 py-2.5 hidden lg:table-cell">Today</TableHead>
                    <TableHead className="text-center px-3 py-2.5">Rating</TableHead>
                    <TableHead className="text-right px-4 py-2.5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClinics.map((clinic, idx) => (
                    <TableRow key={clinic.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"} hover:bg-muted/30`}>
                      <TableCell className="px-4 py-2.5">
                        <a href={`/clinic/${clinic.slug}`} className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
                          {clinic.name}
                          <ExternalLink className="size-3" />
                        </a>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{clinic.city}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center"><StatusBadge status={clinic.status} /></TableCell>
                      <TableCell className="px-3 py-2.5 text-center tabular-nums hidden lg:table-cell">{clinic.providerCount}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center tabular-nums hidden lg:table-cell">{clinic.todayAppts}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center tabular-nums">{clinic.avgRating > 0 ? clinic.avgRating.toFixed(1) : "—"}</TableCell>
                      <TableCell className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select onValueChange={(v) => handleStatusChange(clinic.id, v)}>
                            <SelectTrigger className="h-9 w-32 text-xs">
                              <SelectValue placeholder="Change status" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs" disabled={s === clinic.status}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditClinic({ id: clinic.id, name: clinic.name })}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" asChild>
                            <a href={`/staff/dashboard/clinic?clinicId=${clinic.id}`}><ExternalLink className="size-3.5" /></a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="providers" className="pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
              <Input placeholder="Search providers..." className="pl-9 h-9" value={providerSearch} onChange={(e) => setProviderSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : filteredProviders.length === 0 ? (
            <EmptyState title="No providers found." compact />
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b">
                    <TableHead className="px-4 py-2.5">Provider</TableHead>
                    <TableHead className="px-4 py-2.5 hidden md:table-cell">Clinic</TableHead>
                    <TableHead className="text-center px-3 py-2.5">Status</TableHead>
                    <TableHead className="text-center px-3 py-2.5 hidden lg:table-cell">Services</TableHead>
                    <TableHead className="text-center px-3 py-2.5 hidden lg:table-cell">Appts</TableHead>
                    <TableHead className="text-right px-4 py-2.5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviders.map((p, idx) => (
                    <TableRow key={p.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"} hover:bg-muted/30`}>
                      <TableCell className="px-4 py-2.5 font-medium">{p.name}</TableCell>
                      <TableCell className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{p.clinicName}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center"><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="px-3 py-2.5 text-center tabular-nums hidden lg:table-cell">{p.serviceCount}</TableCell>
                      <TableCell className="px-3 py-2.5 text-center tabular-nums hidden lg:table-cell">{p.appointmentCount}</TableCell>
                      <TableCell className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditProvider({ id: p.id, name: p.name })}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <a href={`/staff/dashboard/providers`} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                            View
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editClinic && (
        <EditClinicDialog
          clinicId={editClinic.id}
          clinicName={editClinic.name}
          open={!!editClinic}
          onOpenChange={(v) => { if (!v) setEditClinic(null); }}
          onSuccess={() => { fetchClinics(); }}
        />
      )}

      {editProvider && (
        <EditProviderDialog
          providerId={editProvider.id}
          providerName={editProvider.name}
          open={!!editProvider}
          onOpenChange={(v) => { if (!v) setEditProvider(null); }}
          onSuccess={() => { fetchProviders(); }}
        />
      )}
    </div>
  );
}
