"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditProviderDialogProps {
  providerId: string;
  providerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "SUSPENDED"];

export function EditProviderDialog({ providerId, providerName, open, onOpenChange, onSuccess }: EditProviderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !providerId) return;
    setLoading(true);
    fetch(`/api/staff/providers?includeInactive=true`)
      .then((r) => r.json())
      .then((json) => {
        const provider = (json.data || []).find((p: any) => p.id === providerId);
        if (!provider) throw new Error("Provider not found");
        const flat: Record<string, string> = {};
        for (const key of ["firstName", "lastName", "credentials", "bio", "qualifications", "npiNumber", "yearsExperience", "slotDurationMinutes", "videoVisitLink", "status"]) {
          flat[key] = String(provider[key] ?? "");
        }
        setFields(flat);
      })
      .catch(() => toast.error("Failed to load provider data"))
      .finally(() => setLoading(false));
  }, [open, providerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success("Provider updated");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Provider</DialogTitle>
          <DialogDescription>Emergency edit for {providerName}.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {["firstName", "lastName", "credentials", "bio", "qualifications", "npiNumber", "yearsExperience", "slotDurationMinutes", "videoVisitLink"].map((key) => (
              <div key={key} className={key === "bio" || key === "qualifications" || key === "videoVisitLink" ? "col-span-2 space-y-1" : "space-y-1"}>
                <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
                <Input value={fields[key] || ""} onChange={(e) => setFields((p) => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={fields.status || "ACTIVE"} onValueChange={(v) => setFields((p) => ({ ...p, status: v }))}>
                <SelectTrigger className=""><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving || loading} className="">
            {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
