"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Users, Plus, Loader2, Trash2, UserCog, Copy, Check, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/staff/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import type { DoctASessionUser } from "@/lib/auth";

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  CLINIC_ADMIN: "Admin",
  CLINIC_RECEPTION: "Receptionist",
  SYSTEM_MANAGER: "System Manager",
};

const ROLE_COLORS: Record<string, string> = {
  CLINIC_ADMIN: "bg-purple-100 text-purple-600 border-purple-200",
  CLINIC_RECEPTION: "bg-blue-100 text-blue-600 border-blue-200",
  SYSTEM_MANAGER: "bg-amber-100 text-amber-600 border-amber-200",
};

export default function StaffPage() {
  const { data: session } = useSession();
  const user = session?.user as DoctASessionUser | undefined;
  const clinicId = user?.clinicId as string | undefined;

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showInviteResult, setShowInviteResult] = useState<{ email: string; tempPassword: string; inviteUrl: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("CLINIC_RECEPTION");

  const fetchStaff = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/staff?clinicId=${clinicId}`);
      if (res.ok) {
        const d = await res.json();
        setStaff(d.data || []);
      }
    } catch {} finally { setLoading(false); }
  }, [clinicId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleInvite = async () => {
    if (!clinicId || !inviteEmail || !inviteName) {
      toast.error("Email and name are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/staff?clinicId=${clinicId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to invite");
      setShowInviteResult({ email: inviteEmail, tempPassword: result.tempPassword, inviteUrl: result.inviteUrl });
      setShowInvite(false);
      setInviteEmail(""); setInviteName(""); setInviteRole("CLINIC_RECEPTION");
      fetchStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}? They will lose access until reactivated.`)) return;
    try {
      const res = await fetch(`/api/staff/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to deactivate");
      toast.success("User deactivated");
      fetchStaff();
    } catch { toast.error("Failed to deactivate"); }
  };

  const copyInviteInfo = async () => {
    if (!showInviteResult) return;
    const text = `Login: ${showInviteResult.email}\nTemp Password: ${showInviteResult.tempPassword}\nURL: ${showInviteResult.inviteUrl}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Staff Management"
        description="Invite and manage clinic staff. Receptionists have limited access."
      >
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowInvite(true)}>
          <Plus className="size-4 mr-1.5" /> Invite Staff
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : staff.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="size-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No staff members</p>
          <p className="text-xs text-muted-foreground mt-1">Invite clinic administrators and receptionists to manage the clinic.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowInvite(true)}>
            <Plus className="size-3.5 mr-1.5" /> Invite First Staff Member
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {staff.map((member) => (
            <div key={member.id} className={`bg-background rounded-xl border border-border/60 shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-shadow ${!member.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${member.role === "CLINIC_ADMIN" ? "bg-purple-100" : "bg-blue-100"}`}>
                  <UserCog className={`size-4 ${member.role === "CLINIC_ADMIN" ? "text-purple-600" : "text-blue-600"}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    {member.name}
                    <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[member.role] || ""}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </Badge>
                    {!member.isActive && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">Inactive</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {member.email}
                    {member.lastLoginAt && <span className="ml-2">Last login: {format(parseISO(member.lastLoginAt), "MMM d, yyyy")}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {member.isActive && (
                  <Button variant="ghost" size="icon" className="size-8 text-red-400 hover:text-red-600" onClick={() => handleDeactivate(member.id, member.name)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={(open) => { if (!open) setShowInvite(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
            <DialogDescription>Create an account for a new staff member. They will receive a temporary password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteName">Full Name</Label>
              <Input id="inviteName" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g., Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@clinic.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteRole">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="inviteRole" className="">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLINIC_ADMIN">Admin — full clinic management</SelectItem>
                  <SelectItem value="CLINIC_RECEPTION">Receptionist — appointments & check-in only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowInvite(false)} disabled={saving}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleInvite} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Result Dialog */}
      <Dialog open={!!showInviteResult} onOpenChange={(open) => { if (!open) setShowInviteResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Staff Account Created</DialogTitle>
            <DialogDescription>Share these credentials securely with the new staff member. No email service is configured — copy them manually.</DialogDescription>
          </DialogHeader>
          {showInviteResult && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2 text-sm">
                <div>
                  <span className="text-xs font-medium text-yellow-700">Login URL</span>
                  <a href={showInviteResult.inviteUrl} target="_blank" rel="noopener noreferrer" className="block text-emerald-600 underline underline-offset-2 truncate">
                    {showInviteResult.inviteUrl} <ExternalLink className="size-3 inline" />
                  </a>
                </div>
                <div>
                  <span className="text-xs font-medium text-yellow-700">Email</span>
                  <p className="font-mono text-xs mt-0.5">{showInviteResult.email}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-yellow-700">Temporary Password</span>
                  <p className="font-mono text-xs mt-0.5 bg-yellow-100 px-1.5 py-0.5 rounded inline-block">{showInviteResult.tempPassword}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={copyInviteInfo}>
                {copied ? <Check className="size-4 mr-1.5 text-emerald-600" /> : <Copy className="size-4 mr-1.5" />}
                {copied ? "Copied!" : "Copy All"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
