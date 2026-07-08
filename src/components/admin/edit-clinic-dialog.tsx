"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditClinicDialogProps {
  clinicId: string;
  clinicName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditClinicDialog({ clinicId, clinicName, open, onOpenChange, onSuccess }: EditClinicDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/staff/clinic-info?clinicId=${clinicId}`)
      .then((r) => r.json())
      .then((data) => {
        const flat: Record<string, string> = {};
        for (const key of ["name", "phoneNumber", "email", "website", "streetAddress", "city", "state", "zipCode", "tagline"]) {
          flat[key] = String(data[key] ?? "");
        }
        setFields(flat);
      })
      .catch(() => toast.error("Failed to load clinic data"))
      .finally(() => setLoading(false));
  }, [open, clinicId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/clinic-info?clinicId=${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success("Clinic updated");
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
          <DialogTitle>Edit Clinic</DialogTitle>
          <DialogDescription>Emergency edit for {clinicName}.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {["name", "phoneNumber", "email", "website", "streetAddress", "city", "state", "zipCode", "tagline"].map((key) => (
              <div key={key} className={key === "name" || key === "streetAddress" || key === "tagline" ? "col-span-2 space-y-1" : "space-y-1"}>
                <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
                <Input value={fields[key] || ""} onChange={(e) => setFields((p) => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
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
