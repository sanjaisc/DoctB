"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Users, Plus, Search, X, Loader2, Save,
  ChevronDown, MoreHorizontal, Pencil, Trash2,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/staff/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageCropper } from "@/components/staff/ImageCropper";
import type { DoctASessionUser } from "@/lib/auth";

interface LanguageItem { id: string; name: string; nativeName: string | null; }

interface ProviderItem {
  id: string;
  firstName: string;
  lastName: string;
  credentials: string | null;
  slug: string;
  bio: string | null;
  photoUrl: string | null;
  npiNumber: string | null;
  yearsExperience: number | null;
  slotDurationMinutes: number;
  status: string;
  videoVisitLink: string | null;
  _count: { slotTemplates: number; appointments: number };
}

interface ServiceItem {
  id: string;
  name: string;
  specialty?: { name: string };
}

const CREDENTIALS = ["MD", "DO", "NP", "PA-C", "DDS", "DMD", "PhD", "Other"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProvidersPage() {
  const { data: session } = useSession();
  const user = session?.user as DoctASessionUser | undefined;
  const clinicId = user?.clinicId as string | undefined;

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit dialog
  const [editProvider, setEditProvider] = useState<ProviderItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formCredentials, setFormCredentials] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formNpi, setFormNpi] = useState("");
  const [formYearsExp, setFormYearsExp] = useState("");
  const [formSlotDuration, setFormSlotDuration] = useState("30");
  const [formStatus, setFormStatus] = useState("ACTIVE");
  const [formVideoLink, setFormVideoLink] = useState("");

  // Photo
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [showPhotoCropper, setShowPhotoCropper] = useState(false);

  // Qualifications
  const [formQualifications, setFormQualifications] = useState("");

  // Languages
  const [allLanguages, setAllLanguages] = useState<LanguageItem[]>([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<Set<string>>(new Set());

  // Schedule templates
  const [templates, setTemplates] = useState<Array<{
    id?: string; dayOfWeek: number; startTime: string; endTime: string; modality: string;
  }>>([]);

  // Service mapping
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  const fetchProviders = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/providers?clinicId=${clinicId}&includeInactive=true`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data.data || []);
      }
    } catch {} finally { setLoading(false); }
  }, [clinicId]);

  const fetchServices = useCallback(async () => {
    if (!clinicId) return;
    try {
      const res = await fetch(`/api/staff/services?clinicId=${clinicId}`);
      if (res.ok) {
        const data = await res.json();
        setAllServices(data.assigned || []);
      }
    } catch {}
  }, [clinicId]);

  useEffect(() => { fetchProviders(); fetchServices(); }, [fetchProviders, fetchServices]);

  const openEditDialog = async (provider: ProviderItem | null) => {
    setEditProvider(provider);
    setFormFirstName(provider?.firstName || "");
    setFormLastName(provider?.lastName || "");
    setFormCredentials(provider?.credentials || "");
    setFormBio(provider?.bio || "");
    setFormQualifications((provider as unknown as Record<string, unknown>)?.qualifications as string || "");
    setFormNpi(provider?.npiNumber || "");
    setFormYearsExp(provider?.yearsExperience?.toString() || "");
    setFormSlotDuration(provider?.slotDurationMinutes?.toString() || "30");
    setFormStatus(provider?.status || "ACTIVE");
    setFormVideoLink(provider?.videoVisitLink || "");
    setFormPhoto(provider?.photoUrl || null);
    setTemplates([]);
    setSelectedServiceIds(new Set());
    setSelectedLanguageIds(new Set());

    try {
      const [tplRes, svcRes, provRes, langRes] = await Promise.all([
        fetch(`/api/staff/templates?providerId=${provider?.id || ""}`),
        fetch(`/api/staff/services?clinicId=${clinicId}`),
        ...(provider ? [fetch(`/api/staff/providers/${provider.id}`)] : []),
        fetch(`/api/staff/clinic-info/languages?clinicId=${clinicId}`),
      ]);
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        setTemplates((tplData.data || []).map((t: { id: string; dayOfWeek: number; startTime: string; endTime: string; modality: string }) => ({
          id: t.id, dayOfWeek: t.dayOfWeek, startTime: t.startTime, endTime: t.endTime, modality: t.modality,
        })));
      }
      if (svcRes.ok) {
        const svcData = await svcRes.json();
        setAllServices(svcData.assigned || []);
      }
      if (langRes.ok) {
        const langData = await langRes.json();
        setAllLanguages(langData.all || []);
        setSelectedLanguageIds(new Set((langData.selected || []).map((l: LanguageItem) => l.id)));
      }
      if (provRes?.ok) {
        const provData = await provRes.json();
        const p = provData.data;
        setSelectedServiceIds(new Set<string>((p.providerServices || []).map((ps: { serviceId: string }) => ps.serviceId)));
        setSelectedLanguageIds(new Set<string>((p.languages || []).map((pl: { languageId: string }) => pl.languageId)));
      }
    } catch {}

    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!clinicId || !formFirstName || !formLastName) {
      toast.error("First name and last name are required");
      return;
    }

    // Overlap detection for templates
    for (let i = 0; i < templates.length; i++) {
      for (let j = i + 1; j < templates.length; j++) {
        const a = templates[i], b = templates[j];
        if (a.dayOfWeek === b.dayOfWeek) {
          const aS = a.startTime, aE = a.endTime, bS = b.startTime, bE = b.endTime;
          if (aS < bE && bS < aE) {
            toast.error(`Overlapping times on ${DAY_NAMES[a.dayOfWeek]}: ${aS}-${aE} and ${bS}-${bE}`);
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: formFirstName,
        lastName: formLastName,
        credentials: formCredentials || null,
        bio: formBio || null,
        qualifications: formQualifications || null,
        npiNumber: formNpi || null,
        yearsExperience: formYearsExp ? parseInt(formYearsExp) : null,
        slotDurationMinutes: parseInt(formSlotDuration) || 30,
        status: formStatus,
        videoVisitLink: formVideoLink || null,
      };

      let providerId: string;
      if (editProvider) {
        const res = await fetch(`/api/staff/providers/${editProvider.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update provider");
        const data = await res.json();
        providerId = data.data.id;
      } else {
        const res = await fetch(`/api/staff/providers?clinicId=${clinicId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create provider");
        const data = await res.json();
        providerId = data.data.id;
      }

      // Save photo
      if (formPhoto && formPhoto !== editProvider?.photoUrl) {
        await fetch(`/api/staff/providers/${providerId}/photo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: formPhoto }),
        }).catch(() => {});
      }

      // Save services
      await fetch(`/api/staff/providers/${providerId}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds: Array.from(selectedServiceIds) }),
      });

      // Save languages
      await fetch(`/api/staff/providers/${providerId}/languages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageIds: Array.from(selectedLanguageIds) }),
      });

      // Save templates
      for (const tpl of templates) {
        if (tpl.id) {
          await fetch(`/api/staff/templates/${tpl.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tpl),
          }).catch(() => {});
        } else {
          await fetch(`/api/staff/templates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...tpl, providerId }),
          }).catch(() => {});
        }
      }

      toast.success(editProvider ? "Provider updated" : "Provider created");
      setShowEditDialog(false);
      fetchProviders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save provider");
    } finally { setSaving(false); }
  };

  const addTemplate = () => {
    setTemplates([...templates, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", modality: "IN_PERSON" }]);
  };

  const updateTemplate = (idx: number, field: string, value: unknown) => {
    setTemplates(templates.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const removeTemplate = (idx: number) => {
    const tpl = templates[idx];
    if (tpl?.id) {
      fetch(`/api/staff/templates/${tpl.id}`, { method: "DELETE" }).catch(() => {});
    }
    setTemplates(templates.filter((_, i) => i !== idx));
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = providers.filter((p) =>
    !search || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader title="Providers" description="Manage clinic providers, schedules, and services">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openEditDialog(null)}>
          <Plus className="size-4 mr-1.5" /> Add Provider
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
        <Input
          placeholder="Search providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Provider list */}
      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No providers found</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((provider) => (
            <div key={provider.id} className="bg-background rounded-xl border border-border/60 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {provider.photoUrl ? (
                    <img src={provider.photoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Users className="size-5 text-emerald-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    Dr. {provider.firstName} {provider.lastName}
                    {provider.credentials && <span className="text-muted-foreground font-normal">, {provider.credentials}</span>}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Badge variant="outline" className={`text-[10px] ${provider.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {provider.status}
                    </Badge>
                    <span>{provider._count.slotTemplates} templates</span>
                    <span>{provider._count.appointments} appointments</span>
                    <span>{provider.slotDurationMinutes} min slots</span>
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => openEditDialog(provider)} className="cursor-pointer">
                    <Pencil className="size-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      if (!confirm(`Deactivate Dr. ${provider.firstName} ${provider.lastName}?`)) return;
                      await fetch(`/api/staff/providers/${provider.id}`, { method: "DELETE" });
                      toast.success("Provider deactivated");
                      fetchProviders();
                    }}
                    className="cursor-pointer text-red-600"
                  >
                    <Trash2 className="size-3.5 mr-2" /> Deactivate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) setShowEditDialog(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProvider ? "Edit Provider" : "Add Provider"}</DialogTitle>
            <DialogDescription>
              {editProvider ? `Editing Dr. ${editProvider.firstName} ${editProvider.lastName}` : "Create a new provider for this clinic"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Photo */}
            <div className="space-y-2">
              <Label>Photo (1:1)</Label>
              {showPhotoCropper ? (
                <ImageCropper
                  aspect={1}
                  maxSizeMB={5}
                  onCropComplete={(dataUrl) => { setFormPhoto(dataUrl); setShowPhotoCropper(false); }}
                  onCancel={() => setShowPhotoCropper(false)}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                    {formPhoto ? <img src={formPhoto} alt="" className="size-full object-cover" /> : <Users className="size-6 text-muted-foreground/40" />}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="" onClick={() => setShowPhotoCropper(true)}>
                      {formPhoto ? "Change Photo" : "Upload Photo"}
                    </Button>
                    {formPhoto && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => setFormPhoto(null)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={formLastName} onChange={(e) => setFormLastName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Credentials</Label>
                <Select value={formCredentials} onValueChange={setFormCredentials}>
                  <SelectTrigger className=""><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {CREDENTIALS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>NPI Number</Label>
                <Input value={formNpi} onChange={(e) => setFormNpi(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Years Experience</Label>
                <Input type="number" min={0} value={formYearsExp} onChange={(e) => setFormYearsExp(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Slot Duration (minutes)</Label>
                <Select value={formSlotDuration} onValueChange={setFormSlotDuration}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60].map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Video Visit Link</Label>
                <Input value={formVideoLink} onChange={(e) => setFormVideoLink(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea value={formBio} onChange={(e) => setFormBio(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Qualifications</Label>
              <Textarea value={formQualifications} onChange={(e) => setFormQualifications(e.target.value)} rows={2} placeholder="Board certifications, medical school, residency..." />
            </div>

            <Separator />

            {/* Schedule Templates */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Schedule Templates</Label>
                <Button variant="outline" size="sm" onClick={addTemplate} className="">
                  <Plus className="size-3.5 mr-1" /> Add Time Range
                </Button>
              </div>
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">No templates. Add a time range to define this provider's weekly schedule.</p>
              )}
              {templates.map((tpl, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
                  <Select value={String(tpl.dayOfWeek)} onValueChange={(v) => updateTemplate(idx, "dayOfWeek", parseInt(v))}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((name, d) => <SelectItem key={d} value={String(d)}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="time" value={tpl.startTime} onChange={(e) => updateTemplate(idx, "startTime", e.target.value)} className="h-8 w-24 text-xs" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="time" value={tpl.endTime} onChange={(e) => updateTemplate(idx, "endTime", e.target.value)} className="h-8 w-24 text-xs" />
                  <Select value={tpl.modality} onValueChange={(v) => updateTemplate(idx, "modality", v)}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_PERSON">In-Person</SelectItem>
                      <SelectItem value="VIDEO">Video</SelectItem>
                    </SelectContent>
                  </Select>
                  <button onClick={() => removeTemplate(idx)} className="size-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center shrink-0 cursor-pointer">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Language Assignment */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Languages</Label>
              {allLanguages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No languages configured for this clinic.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {allLanguages.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setSelectedLanguageIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(lang.id)) next.delete(lang.id); else next.add(lang.id);
                        return next;
                      })}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer ${
                        selectedLanguageIds.has(lang.id)
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                          : "bg-background text-muted-foreground border-border/60 hover:border-emerald-300"
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Service Mapping */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Assigned Services</Label>
              {allServices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No services assigned to this clinic. Go to Services to assign them.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {(() => {
                    const grouped: Record<string, ServiceItem[]> = {};
                    allServices.forEach((svc) => {
                      const key = svc.specialty?.name || "Other";
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(svc);
                    });
                    return Object.entries(grouped).map(([specialty, svcs]) => (
                      <div key={specialty} className="col-span-2">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{specialty}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {svcs.map((svc) => (
                            <label key={svc.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/60 cursor-pointer hover:bg-muted/30 transition-colors">
                              <Checkbox checked={selectedServiceIds.has(svc.id)} onCheckedChange={() => toggleService(svc.id)} />
                              <span className="text-sm">{svc.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)} disabled={saving}>
                Cancel
              </Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
                {editProvider ? "Save Changes" : "Create Provider"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
