"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemConfig {
  minDepositCents: number;
  maxDepositCents: number;
  lockTtlSeconds: number;
  slotGenerationWindowDays: number;
  waitlistProcessingDelayMin: number;
  zeroDepositRequireCard: boolean;
  platformFeeCents: number;
  reviewWindowDays: number;
}

export default function ConfigurationPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/admin/system-config");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setConfig(json.data);
    } catch {
      setError("Failed to load system configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const updateField = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff/admin/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Configuration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !config) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900">
        <CardContent className="flex items-center gap-4 p-6">
          <AlertCircle className="size-10 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 dark:text-red-300">Error</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error || "No data"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchConfig}>
            <RefreshCw className="size-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Platform Configuration</h2>
          <p className="text-sm text-muted-foreground">Manage global system settings and financial boundaries.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
          Save All
        </Button>
      </div>

      {/* Deposit Boundaries */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit Boundaries</CardTitle>
          <CardDescription>Platform-wide minimum and maximum deposit limits that clinics must adhere to.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="minDeposit">Minimum Deposit (cents)</Label>
            <Input id="minDeposit" type="number" min={0} value={config.minDepositCents} onChange={(e) => updateField("minDepositCents", Number(e.target.value))} />
            <p className="text-[11px] text-muted-foreground">{`$${(config.minDepositCents / 100).toFixed(2)}`}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxDeposit">Maximum Deposit (cents)</Label>
            <Input id="maxDeposit" type="number" min={0} value={config.maxDepositCents} onChange={(e) => updateField("maxDepositCents", Number(e.target.value))} />
            <p className="text-[11px] text-muted-foreground">{`$${(config.maxDepositCents / 100).toFixed(2)}`}</p>
          </div>
        </CardContent>
      </Card>

      {/* Lock & Slots */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lock TTL</CardTitle>
            <CardDescription>How long a slot stays locked during checkout before auto-release.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="lockTtl">TTL (seconds)</Label>
            <Input id="lockTtl" type="number" min={60} value={config.lockTtlSeconds} onChange={(e) => updateField("lockTtlSeconds", Number(e.target.value))} />
            <p className="text-[11px] text-muted-foreground">{config.lockTtlSeconds >= 60 ? `${Math.round(config.lockTtlSeconds / 60)} minutes` : "Minimum 60 seconds"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Slot Generation Window</CardTitle>
            <CardDescription>How far into the future slots are generated from templates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="slotWindow">Days Ahead</Label>
            <Input id="slotWindow" type="number" min={14} value={config.slotGenerationWindowDays} onChange={(e) => updateField("slotGenerationWindowDays", Number(e.target.value))} />
          </CardContent>
        </Card>
      </div>

      {/* $0 Deposit & Waitlist */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>$0 Deposit Behavior</CardTitle>
            <CardDescription>Controls whether $0 deposits skip checkout entirely or require a card on file.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require Card on File</p>
              <p className="text-xs text-muted-foreground mt-0.5">When enabled, patients with $0 deposit must still provide card details for no-show penalties.</p>
            </div>
            <Switch checked={config.zeroDepositRequireCard} onCheckedChange={(v) => updateField("zeroDepositRequireCard", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waitlist Processing Delay</CardTitle>
            <CardDescription>Minutes to wait after a slot opens before processing waitlist assignments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="waitlistDelay">Delay (minutes)</Label>
            <Input id="waitlistDelay" type="number" min={0} value={config.waitlistProcessingDelayMin} onChange={(e) => updateField("waitlistProcessingDelayMin", Number(e.target.value))} />
          </CardContent>
        </Card>
      </div>

      {/* Review Window & Platform Fee */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Review Window</CardTitle>
            <CardDescription>Days after an appointment when the "Rate Your Visit" email is triggered.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="reviewWindow">Days</Label>
            <Input id="reviewWindow" type="number" min={1} value={config.reviewWindowDays} onChange={(e) => updateField("reviewWindowDays", Number(e.target.value))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Fee</CardTitle>
            <CardDescription>Per-booking platform fee charged to clinics (in cents).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="platformFee">Fee (cents)</Label>
            <Input id="platformFee" type="number" min={0} value={config.platformFeeCents} onChange={(e) => updateField("platformFeeCents", Number(e.target.value))} />
            <p className="text-[11px] text-muted-foreground">{`$${(config.platformFeeCents / 100).toFixed(2)} per booking`}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
