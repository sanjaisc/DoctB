"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CalendarX, Plus, Loader2, Trash2, Pencil, X } from "lucide-react";
import { PageHeader } from "@/components/staff/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import type { DoctASessionUser } from "@/lib/auth";

interface ClosureItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
}

export default function ClosuresPage() {
  const { data: session } = useSession();
  const user = session?.user as DoctASessionUser | undefined;
  const clinicId = user?.clinicId as string | undefined;

  const [closures, setClosures] = useState<ClosureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<ClosureItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);

  const fetchClosures = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/closures?clinicId=${clinicId}&includePast=false`);
      if (res.ok) {
        const data = await res.json();
        setClosures(data.data || []);
      }
    } catch {} finally { setLoading(false); }
  }, [clinicId]);

  useEffect(() => { fetchClosures(); }, [fetchClosures]);

  const openAdd = () => {
    setEditItem(null);
    setTitle("");
    setStartDate("");
    setEndDate("");
    setIsRecurring(false);
    setShowDialog(true);
  };

  const openEdit = (item: ClosureItem) => {
    setEditItem(item);
    setTitle(item.title);
    setStartDate(item.startDate.slice(0, 10));
    setEndDate(item.endDate.slice(0, 10));
    setIsRecurring(item.isRecurring);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!clinicId || !title || !startDate || !endDate) {
      toast.error("All fields are required");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be on or after start date");
      return;
    }
    setSaving(true);
    try {
      const body = { title, startDate, endDate, isRecurring };
      if (editItem) {
        const res = await fetch(`/api/staff/closures/${editItem.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        const res = await fetch(`/api/staff/closures?clinicId=${clinicId}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create");
      }
      toast.success(editItem ? "Closure updated" : "Closure created");
      setShowDialog(false);
      fetchClosures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this closure?")) return;
    try {
      const res = await fetch(`/api/staff/closures/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Closure deleted");
      fetchClosures();
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Closures"
        description="Manage holidays and one-off clinic closures. Slots are automatically suppressed during closure periods."
      >
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openAdd}>
          <Plus className="size-4 mr-1.5" /> Add Closure
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : closures.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <CalendarX className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No upcoming closures</p>
          <p className="text-xs text-muted-foreground mt-1">Add holidays or one-off closures to automatically suppress slot generation.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>
            <Plus className="size-3.5 mr-1.5" /> Add First Closure
          </Button>
        </CardContent></Card>
      ) : (
        <>
          {/* Weekly Hours hint */}
          <Card className="border-border/50 shadow-sm bg-emerald-50/30">
            <CardContent className="p-4">
              <p className="text-sm text-emerald-700">
                <strong>Weekly hours</strong> are configured on the{" "}
                <a href="/staff/dashboard/clinic" className="underline underline-offset-2 font-medium">Clinic Profile</a> page.
                This page manages one-off closures and recurring holidays.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {closures.map((closure) => (
              <div key={closure.id} className="bg-background rounded-xl border border-border/60 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <CalendarX className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      {closure.title}
                      {closure.isRecurring && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">Recurring</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(closure.startDate), "MMM d, yyyy")} — {format(parseISO(closure.endDate), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(closure)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(closure.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setShowDialog(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Closure" : "Add Closure"}</DialogTitle>
            <DialogDescription>Define a date range during which the clinic is closed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="closureTitle">Title</Label>
              <Input id="closureTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Christmas Holiday" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={isRecurring} onCheckedChange={(c) => setIsRecurring(c === true)} />
              <span className="text-sm">Repeats yearly (annual holiday)</span>
            </label>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)} disabled={saving}>
                Cancel
              </Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
                {editItem ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
