"use client";

import { useState } from "react";
import { Server, Database, RefreshCw, Trash2, CheckCircle2, AlertCircle, Loader2, HardDrive, Activity, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminInfrastructurePage() {
  const [cacheStatus, setCacheStatus] = useState<{ loading: boolean; result: string | null; error: string | null }>({ loading: false, result: null, error: null });
  const [seedStatus, setSeedStatus] = useState<{ loading: boolean; result: string | null; error: string | null }>({ loading: false, result: null, error: null });
  const [purgeStatus, setPurgeStatus] = useState<{ loading: boolean; result: string | null; error: string | null }>({ loading: false, result: null, error: null });
  const [purgeConfirm, setPurgeConfirm] = useState(false);

  const purgeCache = async () => {
    setCacheStatus({ loading: true, result: null, error: null });
    try {
      const res = await fetch("/api/staff/admin/cache/purge", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setCacheStatus({ loading: false, result: `Purged ${json.entriesRemoved} entries`, error: null });
    } catch (e: any) {
      setCacheStatus({ loading: false, result: null, error: e.message });
    }
  };

  const runPurge = async () => {
    setPurgeStatus({ loading: true, result: null, error: null });
    try {
      const res = await fetch("/api/staff/admin/taxonomies/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      const c = json.counts;
      setPurgeStatus({ loading: false, result: `Removed ${c.specialties} specialties, ${c.services} services, ${c.insurances} insurances, ${c.serviceInsurances} copay records`, error: null });
      setPurgeConfirm(false);
    } catch (e: any) {
      setPurgeStatus({ loading: false, result: null, error: e.message });
    }
  };

  const runSeed = async () => {
    setSeedStatus({ loading: true, result: null, error: null });
    try {
      const res = await fetch("/api/staff/admin/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error || "Failed");
      setSeedStatus({ loading: false, result: "Demo data regenerated", error: null });
    } catch (e: any) {
      setSeedStatus({ loading: false, result: null, error: e.message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Infrastructure & Integrations</h2>
        <p className="text-sm text-muted-foreground">Cache management, demo data regeneration, and background jobs.</p>
      </div>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <HardDrive className="size-4" /> Cache Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The application uses an in-memory cache layer. Purge to force-fetch fresh data from the database.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={purgeCache} disabled={cacheStatus.loading}>
              {cacheStatus.loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
              Purge Cache
            </Button>
            {cacheStatus.result && <Badge variant="secondary"><CheckCircle2 className="size-3 mr-1" />{cacheStatus.result}</Badge>}
            {cacheStatus.error && <Badge variant="destructive"><AlertCircle className="size-3 mr-1" />{cacheStatus.error}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Demo Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Database className="size-4" /> Demo Data Regeneration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Regenerate all demo data (clinics, providers, slots, appointments, staff users). This will destroy and recreate
            all seed data, preserving any production records.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={runSeed} disabled={seedStatus.loading}>
              {seedStatus.loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
              Regenerate Seed Data
            </Button>
            {seedStatus.result && <Badge variant="secondary"><CheckCircle2 className="size-3 mr-1" />{seedStatus.result}</Badge>}
            {seedStatus.error && <Badge variant="destructive"><AlertCircle className="size-3 mr-1" />{seedStatus.error}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Soft-Delete Purge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Archive className="size-4" /> Purge Soft-Deleted Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete all records that have been soft-deleted (<code className="text-xs bg-muted px-1 py-0.5 rounded">isActive=false</code>):
            specialties, services, insurances, and copay records. This action cannot be undone.
          </p>
          <div className="flex items-center gap-3">
            {!purgeConfirm ? (
              <Button variant="outline" className="text-destructive border-destructive/50" onClick={() => setPurgeConfirm(true)} disabled={purgeStatus.loading}>
                <Trash2 className="size-4 mr-2" />
                Purge Soft-Deleted
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="destructive" onClick={runPurge} disabled={purgeStatus.loading}>
                  {purgeStatus.loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <AlertCircle className="size-4 mr-2" />}
                  Confirm Permanent Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPurgeConfirm(false)}>Cancel</Button>
              </div>
            )}
            {purgeStatus.result && <Badge variant="secondary"><CheckCircle2 className="size-3 mr-1" />{purgeStatus.result}</Badge>}
            {purgeStatus.error && <Badge variant="destructive"><AlertCircle className="size-3 mr-1" />{purgeStatus.error}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Background Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="size-4" /> Background Job Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No background job system (Redis/BullMQ) is currently installed. The following jobs are not running:
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Slot lock cleanup — expired locks remain until TTL expires naturally</li>
            <li>Waitlist processor — waitlist entries are not automatically notified</li>
            <li>Email dispatch — token URLs are generated but not delivered</li>
            <li>Automated slot generation — slots are generated only via seed</li>
          </ul>
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Architecture Gap</AlertTitle>
            <AlertDescription>
              For production, install Redis and BullMQ to enable background job processing. See{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">AGENTS.md</code> for details.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
