"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Shield, UserCog, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_OPTIONS = [
  { value: "SYSTEM_MANAGER", label: "System Manager", icon: Shield },
  { value: "CLINIC_ADMIN", label: "Clinic Admin", icon: UserCog },
  { value: "CLINIC_RECEPTION", label: "Clinic Reception", icon: UserRound },
] as const;

interface ClinicOption {
  id: string;
  name: string;
}

interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinics: ClinicOption[];
  onSuccess: () => void;
}

export function CreateStaffDialog({ open, onOpenChange, clinics, onSuccess }: CreateStaffDialogProps) {
  const [step, setStep] = useState<"form" | "result">("form");
  const [role, setRole] = useState("SYSTEM_MANAGER");
  const [clinicId, setClinicId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ tempPassword: string; inviteUrl: string } | null>(null);

  const reset = () => {
    setStep("form");
    setRole("SYSTEM_MANAGER");
    setClinicId("");
    setName("");
    setEmail("");
    setCreating(false);
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setCreating(true);
    try {
      const params = role !== "SYSTEM_MANAGER" && clinicId ? `?clinicId=${clinicId}` : "";
      const res = await fetch(`/api/staff/staff${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      const json = await res.json();
      setResult({ tempPassword: json.tempPassword, inviteUrl: json.inviteUrl });
      setStep("result");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step === "form" ? "Create Staff Account" : "Account Created"}</DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Create a new staff account. Temporary credentials will be shown once."
              : "Copy these credentials now — they will not be shown again."}
          </DialogDescription>
        </DialogHeader>

        {step === "result" && result ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Account Created</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Role:</span> {ROLE_OPTIONS.find((r) => r.value === role)?.label || role}
                </p>
                <p>
                  <span className="font-medium">Temporary Password:</span>{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{result.tempPassword}</code>
                </p>
                <p>
                  <span className="font-medium">Invite URL:</span>{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono break-all">{result.inviteUrl}</code>
                </p>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">Copy these now. They will not be shown again.</p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button className="">Done</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="staffRole">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="staffRole" className="">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <span className="flex items-center gap-2">{r.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {role !== "SYSTEM_MANAGER" && (
              <div className="space-y-1.5">
                <Label htmlFor="staffClinic">Clinic</Label>
                <Select value={clinicId} onValueChange={setClinicId}>
                  <SelectTrigger id="staffClinic" className="">
                    <SelectValue placeholder="Select a clinic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="staffName">Name</Label>
              <Input id="staffName" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staffEmail">Email</Label>
              <Input id="staffEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={creating || (role !== "SYSTEM_MANAGER" && !clinicId)} className="">
                {creating ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
