"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, X, Loader2, Search, Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/staff/PageHeader";
import { EmptyState } from "@/components/staff/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

type TaxonomyType = "specialty" | "service" | "insurance" | "amenity" | "language";

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  isBookable?: boolean;
  isDemo?: boolean;
  sortOrder: number;
  icon?: string;
  code?: string;
  description?: string;
  durationMinutes?: number;
  selfPayPriceCents?: number;
  selfPayPaymentType?: string;
  specialtyId?: string;
}

interface CopayEntry {
  id: string;
  serviceId: string;
  insuranceId: string;
  copayCents: number;
  insurance: { id: string; name: string; isDemo: boolean };
}

const TAXONOMY_LABELS: Record<TaxonomyType, string> = {
  specialty: "Specialties",
  service: "Services",
  insurance: "Insurances",
  amenity: "Amenities",
  language: "Languages",
};

export default function TaxonomiesPage() {
  const [activeTab, setActiveTab] = useState<TaxonomyType>("specialty");
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editItem, setEditItem] = useState<TaxonomyItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [copayService, setCopayService] = useState<string | null>(null);
  const [copayData, setCopayData] = useState<CopayEntry[]>([]);
  const [showCopayDialog, setShowCopayDialog] = useState(false);
  const [copaySaving, setCopaySaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/admin/taxonomies?type=${activeTab}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setItems(json.data || []);
    } catch {
      toast.error("Failed to load taxonomies");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (item?: TaxonomyItem) => {
    setEditItem(item || null);
    setShowDialog(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    setSaving(true);
    try {
      const url = editItem
        ? `/api/staff/admin/taxonomies/${activeTab}/${editItem.id}`
        : `/api/staff/admin/taxonomies?type=${activeTab}`;
      const res = await fetch(url, {
        method: editItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success(editItem ? "Updated" : "Created");
      setShowDialog(false);
      fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (item: TaxonomyItem) => {
    try {
      const res = await fetch(`/api/staff/admin/taxonomies/${activeTab}/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to archive");
      toast.success("Archived");
      fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive");
    }
  };

  const openCopay = async (serviceId: string) => {
    setCopayService(serviceId);
    try {
      const res = await fetch(`/api/staff/admin/services/${serviceId}/copays`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setCopayData(json.data || []);
      setShowCopayDialog(true);
    } catch {
      toast.error("Failed to load pricing data");
    }
  };

  const handleCopaySave = async () => {
    if (!copayService) return;
    setCopaySaving(true);
    try {
      const res = await fetch(`/api/staff/admin/services/${copayService}/copays`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: copayData.map((c) => ({ insuranceId: c.insuranceId, copayCents: c.copayCents })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Pricing saved");
      setShowCopayDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setCopaySaving(false);
    }
  };

  const renderTable = () => {
    if (loading) {
      return <Skeleton className="h-64 rounded-lg" />;
    }

    if (filtered.length === 0) {
      return (
        <EmptyState title={search ? "No matches found." : `No ${TAXONOMY_LABELS[activeTab].toLowerCase()} yet.`} />
      );
    }

    return (
      <div className="rounded-xl border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-b">
              <TableHead className="px-4 py-2.5">Name</TableHead>
              <TableHead className="px-4 py-2.5 hidden md:table-cell">Slug</TableHead>
              {activeTab === "service" && (
                <>
                  <TableHead className="text-center px-3 py-2.5 hidden lg:table-cell">Duration</TableHead>
                  <TableHead className="text-center px-3 py-2.5 hidden lg:table-cell">Price</TableHead>
                  <TableHead className="text-center px-3 py-2.5">Bookable</TableHead>
                </>
              )}
              {activeTab === "language" && (
                <TableHead className="px-4 py-2.5 hidden md:table-cell">Code</TableHead>
              )}
              <TableHead className="text-center px-3 py-2.5">Active</TableHead>
              <TableHead className="text-right px-4 py-2.5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item, idx) => (
              <TableRow key={item.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"} hover:bg-muted/30`}>
                <TableCell className="px-4 py-2.5 font-medium">
                  <div className="flex items-center gap-2">
                    {item.icon && <span className="text-base">{item.icon}</span>}
                    <span>{item.name}</span>
                    {(item as any).isDemo && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">Demo</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-muted-foreground hidden md:table-cell font-mono text-xs">{item.slug}</TableCell>
                {activeTab === "service" && (
                  <>
                    <TableCell className="px-3 py-2.5 text-center tabular-nums hidden lg:table-cell">{item.durationMinutes}m</TableCell>
                    <TableCell className="px-3 py-2.5 text-center tabular-nums hidden lg:table-cell">${((item.selfPayPriceCents || 0) / 100).toFixed(0)}</TableCell>
                    <TableCell className="px-3 py-2.5 text-center">
                      <Switch checked={item.isBookable ?? true} onCheckedChange={async (v) => {
                        await handleSaveForField(item, "isBookable", v);
                      }} />
                    </TableCell>
                  </>
                )}
                {activeTab === "language" && (
                  <TableCell className="px-4 py-2.5 text-muted-foreground hidden md:table-cell font-mono text-xs">{item.code}</TableCell>
                )}
                <TableCell className="px-3 py-2.5 text-center">
                  <Switch checked={item.isActive ?? true} onCheckedChange={async (v) => {
                    await handleSaveForField(item, "isActive", v);
                  }} />
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {activeTab === "service" && (
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openCopay(item.id)} title="Demo Pricing">
                        <Banknote className="size-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(item)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => handleArchive(item)}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const handleSaveForField = async (item: TaxonomyItem, field: string, value: any) => {
    try {
      const res = await fetch(`/api/staff/admin/taxonomies/${activeTab}/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: value } : i)));
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Taxonomy Management"
        description="Manage master lists for the platform."
      >
        <Button className="gap-1.5" onClick={() => openEdit()}>
          <Plus className="size-4" />
          Add {TAXONOMY_LABELS[activeTab].slice(0, -1)}
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaxonomyType)}>
        <TabsList>
          {Object.entries(TAXONOMY_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">{label}</TabsTrigger>
          ))}
        </TabsList>

        {Object.keys(TAXONOMY_LABELS).map((key) => (
          <TabsContent key={key} value={key} className="pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
                <Input
                  placeholder={`Search ${TAXONOMY_LABELS[key as TaxonomyType].toLowerCase()}...`}
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Card>
              <CardContent className="p-0">{renderTable()}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit" : "Add"} {TAXONOMY_LABELS[activeTab].slice(0, -1)}</DialogTitle>
            <DialogDescription>Fill in the details below.</DialogDescription>
          </DialogHeader>
          <TaxonomyForm
            type={activeTab}
            item={editItem}
            onSave={handleSave}
            onCancel={() => setShowDialog(false)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Demo Pricing Dialog */}
      <Dialog open={showCopayDialog} onOpenChange={setShowCopayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Demo Pricing Matrix</DialogTitle>
            <DialogDescription>Set copay amounts for Demo Insurance per service.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {copayData.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium">{entry.insurance.name}</span>
                <Input
                  type="number"
                  className="w-28"
                  value={entry.copayCents}
                  onChange={(e) =>
                    setCopayData((prev) =>
                      prev.map((c) =>
                        c.id === entry.id ? { ...c, copayCents: Number(e.target.value) } : c
                      )
                    )
                  }
                />
                <span className="text-xs text-muted-foreground w-10">cents</span>
              </div>
            ))}
            {copayData.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No insurance links found. Assign insurances first.</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCopaySave} disabled={copaySaving} className="">
              {copaySaving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Save Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaxonomyForm({
  type,
  item,
  onSave,
  onCancel,
  saving,
}: {
  type: TaxonomyType;
  item: TaxonomyItem | null;
  onSave: (data: Record<string, any>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Record<string, any>>(() => ({
    name: item?.name || "",
    slug: item?.slug || "",
    description: item?.description || "",
    icon: item?.icon || "",
    code: item?.code || "",
    durationMinutes: item?.durationMinutes || 30,
    selfPayPriceCents: item?.selfPayPriceCents || 0,
    selfPayPaymentType: item?.selfPayPaymentType || "STANDARD_DEPOSIT",
    isActive: item?.isActive ?? true,
    isBookable: item?.isBookable ?? true,
  }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="taxName">Name *</Label>
        <Input id="taxName" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
      </div>

      {type !== "language" && type !== "amenity" && (
        <div className="space-y-1.5">
          <Label htmlFor="taxSlug">Slug</Label>
          <Input id="taxSlug" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="Auto-generated if empty" />
        </div>
      )}

      {(type === "specialty" || type === "service") && (
        <div className="space-y-1.5">
          <Label htmlFor="taxDesc">Description</Label>
          <Input id="taxDesc" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
      )}

      {type === "specialty" && (
        <div className="space-y-1.5">
          <Label htmlFor="taxIcon">Icon (emoji)</Label>
          <Input id="taxIcon" value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="e.g., 🩺" />
        </div>
      )}

      {type === "service" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="taxDuration">Duration (minutes)</Label>
            <Input id="taxDuration" type="number" min={5} value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxPrice">Self-Pay Price (cents)</Label>
            <Input id="taxPrice" type="number" min={0} value={form.selfPayPriceCents} onChange={(e) => setForm((p) => ({ ...p, selfPayPriceCents: Number(e.target.value) }))} />
          </div>
        </>
      )}

      {type === "language" && (
        <div className="space-y-1.5">
          <Label htmlFor="taxCode">Language Code (ISO 639-1)</Label>
          <Input id="taxCode" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g., en, es" required />
        </div>
      )}

      {type === "amenity" && (
        <div className="space-y-1.5">
          <Label htmlFor="taxIconA">Icon</Label>
          <Input id="taxIconA" value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="e.g., 🅿️" />
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} className="">Cancel</Button>
        <Button type="submit" disabled={saving} className="">
          {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
          {item ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
