"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Mail, FileText, Loader2, Save, Plus, X, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/staff/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SafeEditor } from "@/components/staff/SafeEditor";
import type { DoctASessionUser } from "@/lib/auth";

interface IntakeFieldItem {
  id: string;
  label: string;
  fieldType: string;
  options: string | null;
  required: boolean;
  sortOrder: number;
}

const TEMPLATE_KEYS = ["booking_confirmation", "check_in_reminder", "waitlist_offer"] as const;
const TEMPLATE_LABELS: Record<string, string> = {
  booking_confirmation: "Booking Confirmation",
  check_in_reminder: "Check-in Reminder",
  waitlist_offer: "Waitlist Offer",
};

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  booking_confirmation: {
    subject: "Appointment Confirmed at {{CLINIC_NAME}}",
    body: `<p>Dear {{PATIENT_NAME}},</p><p>Your appointment has been confirmed.</p><p><strong>Date:</strong> {{DATE}}<br/><strong>Time:</strong> {{TIME}}<br/><strong>Location:</strong> {{CLINIC_NAME}}<br/><strong>Address:</strong> {{CLINIC_ADDRESS}}<br/><strong>Phone:</strong> {{CLINIC_PHONE}}</p><p>{{COMMON_INSTRUCTIONS}}</p><p>Manage your appointment: {{MANAGE_URL}}</p>`,
  },
  check_in_reminder: {
    subject: "Reminder: Upcoming Appointment at {{CLINIC_NAME}}",
    body: `<p>Dear {{PATIENT_NAME}},</p><p>This is a reminder of your upcoming appointment.</p><p><strong>Date:</strong> {{DATE}}<br/><strong>Time:</strong> {{TIME}}<br/><strong>Location:</strong> {{CLINIC_NAME}}<br/><strong>Address:</strong> {{CLINIC_ADDRESS}}</p><p>{{COMMON_INSTRUCTIONS}}</p><p>Check in online: {{CHECK_IN_URL}}</p>`,
  },
  waitlist_offer: {
    subject: "Appointment Slot Available at {{CLINIC_NAME}}",
    body: `<p>Dear {{PATIENT_NAME}},</p><p>A slot has become available for your waitlisted service.</p><p><strong>Date:</strong> {{DATE}}<br/><strong>Time:</strong> {{TIME}}</p><p>This offer expires soon. Click below to claim it.</p><p>{{OFFER_URL}}</p>`,
  },
};

const PLACEHOLDER_TAGS = [
  { tag: "{{PATIENT_NAME}}", desc: "Patient's full name" },
  { tag: "{{CLINIC_NAME}}", desc: "Clinic display name" },
  { tag: "{{CLINIC_ADDRESS}}", desc: "Clinic address" },
  { tag: "{{CLINIC_PHONE}}", desc: "Clinic phone number" },
  { tag: "{{DATE}}", desc: "Appointment date" },
  { tag: "{{TIME}}", desc: "Appointment time" },
  { tag: "{{PROVIDER_NAME}}", desc: "Provider's full name" },
  { tag: "{{MANAGE_URL}}", desc: "Manage appointment link" },
  { tag: "{{CHECK_IN_URL}}", desc: "Online check-in link" },
  { tag: "{{OFFER_URL}}", desc: "Waitlist offer link" },
  { tag: "{{COMMON_INSTRUCTIONS}}", desc: "Common instructions from clinic" },
];

interface TemplateEditorProps {
  templateKey: string;
  subject: string;
  body: string;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
}

function TemplateEditor({ templateKey, subject, body, onSubjectChange, onBodyChange }: TemplateEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`subject-${templateKey}`}>Subject Line</Label>
        <Input id={`subject-${templateKey}`} value={subject} onChange={(e) => onSubjectChange(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Email Body</Label>
        <div className="grid grid-cols-[1fr_180px] gap-4">
          <SafeEditor content={body} onChange={onBodyChange} minHeight="250px" />
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="p-3 pb-1.5">
              <CardTitle className="text-xs font-medium text-muted-foreground">Placeholder Tags</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5 text-[11px]">
              {PLACEHOLDER_TAGS.map(({ tag, desc }) => (
                <button
                  key={tag}
                  type="button"
                  className="w-full text-left p-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  title={`Click to copy: ${tag}`}
                  onClick={() => { navigator.clipboard.writeText(tag); toast.info(`Copied ${tag}`); }}
                >
                  <code className="font-mono text-[11px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">{tag}</code>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CommunicationsPage() {
  const { data: session } = useSession();
  const user = session?.user as DoctASessionUser | undefined;
  const clinicId = user?.clinicId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Email templates
  const [templates, setTemplates] = useState<Record<string, { subject: string; body: string }>>(DEFAULT_TEMPLATES);

  // Sender settings
  const [emailFromName, setEmailFromName] = useState("");
  const [customEmailHeader, setCustomEmailHeader] = useState("");

  // Common instructions
  const [commonInstructions, setCommonInstructions] = useState("");

  // Intake reminder cadence
  const [intakeReminderDays, setIntakeReminderDays] = useState("3,1");

  // Intake fields
  const [intakeFields, setIntakeFields] = useState<IntakeFieldItem[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  const fetchData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const [tplRes, intakeRes, fieldsRes] = await Promise.all([
        fetch(`/api/staff/communications/email-templates?clinicId=${clinicId}`),
        fetch(`/api/staff/communications/intake-mapping?clinicId=${clinicId}`),
        fetch(`/api/staff/communications/intake-fields?clinicId=${clinicId}`),
      ]);
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        if (tplData.templates) setTemplates(tplData.templates);
        setEmailFromName(tplData.emailFromName || "");
        setCustomEmailHeader(tplData.customEmailHeader || "");
        setIntakeReminderDays(tplData.intakeReminderDays || "3,1");
      }
      if (intakeRes.ok) {
        const intData = await intakeRes.json();
        setCommonInstructions(intData.commonInstructions || "");
      }
      if (fieldsRes.ok) {
        const fieldsData = await fieldsRes.json();
        setIntakeFields(fieldsData.data || []);
      }
    } catch {} finally { setLoading(false); }
  }, [clinicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTemplateChange = (key: string, field: "subject" | "body", value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      const tplRes = await fetch(`/api/staff/communications/email-templates?clinicId=${clinicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailFromName, customEmailHeader, intakeReminderDays, templates }),
      });
      if (!tplRes.ok) throw new Error("Failed to save sender settings");

      const intRes = await fetch(`/api/staff/communications/intake-mapping?clinicId=${clinicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commonInstructions }),
      });
      if (!intRes.ok) throw new Error("Failed to save common instructions");

      toast.success("All settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <PageHeader
        title="Communications"
        description="Configure email templates, sender settings, and common patient instructions."
      >
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
          Save All
        </Button>
      </PageHeader>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" className="gap-1.5"><Mail className="size-3.5" /> Email Templates</TabsTrigger>
          <TabsTrigger value="sender" className="gap-1.5"><FileText className="size-3.5" /> Sender Settings</TabsTrigger>
          <TabsTrigger value="instructions" className="gap-1.5"><FileText className="size-3.5" /> Common Instructions</TabsTrigger>
          <TabsTrigger value="intake-fields" className="gap-1.5"><FileText className="size-3.5" /> Intake Fields</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Customize the email content sent to patients. Use placeholder tags for dynamic content.</CardDescription>
            </CardHeader>
            <CardContent>
              {TEMPLATE_KEYS.map((key, idx) => {
                const tpl = templates[key];
                if (!tpl) return null;
                return (
                  <div key={key} className={idx > 0 ? "mt-8 pt-8 border-t border-border/60" : ""}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Mail className="size-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">{TEMPLATE_LABELS[key]}</p>
                        <p className="text-xs text-muted-foreground">{key.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <TemplateEditor
                      templateKey={key}
                      subject={tpl.subject}
                      body={tpl.body}
                      onSubjectChange={(v) => handleTemplateChange(key, "subject", v)}
                      onBodyChange={(v) => handleTemplateChange(key, "body", v)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sender" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sender Settings</CardTitle>
              <CardDescription>Configure how automated emails appear in patients inboxes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fromName">From Name</Label>
                <Input id="fromName" value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} placeholder="e.g., Downtown Health Clinic" />
                <p className="text-[11px] text-muted-foreground">Patient-facing sender name for all automated emails.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emailHeader">Custom Email Header</Label>
                <Textarea id="emailHeader" value={customEmailHeader} onChange={(e) => setCustomEmailHeader(e.target.value)} rows={3} placeholder="e.g., Optional pre-header text or clinic branding line" />
                <p className="text-[11px] text-muted-foreground">Appears at the top of every email (supports HTML). Leave empty for default.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intakeCadence">Intake Reminder Cadence</Label>
                <Select value={intakeReminderDays} onValueChange={setIntakeReminderDays}>
                  <SelectTrigger id="intakeCadence" className=""><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3,1">3 days and 1 day before</SelectItem>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="">Do Not Send</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">When to send automated intake form reminders before appointments.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Instructions</CardTitle>
              <CardDescription>Instructions included in every email via the {String.fromCharCode(123, 123)}COMMON_INSTRUCTIONS{String.fromCharCode(125, 125)} tag. e.g., parking info, check-in instructions.</CardDescription>
            </CardHeader>
            <CardContent>
              <SafeEditor content={commonInstructions} onChange={setCommonInstructions} minHeight="250px" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intake-fields" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Intake Form Fields</CardTitle>
              <CardDescription>Customize the fields patients fill out before their appointment via the intake form.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="newFieldLabel">Field Label</Label>
                  <Input id="newFieldLabel" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="e.g., Allergies" />
                </div>
                <div className="w-36 space-y-1.5">
                  <Label htmlFor="newFieldType">Type</Label>
                  <Select value={newFieldType} onValueChange={setNewFieldType}>
                    <SelectTrigger id="newFieldType" className=""><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="mb-0.5"
                  disabled={!newFieldLabel.trim()}
                  onClick={async () => {
                    if (!clinicId || !newFieldLabel.trim()) return;
                    try {
                      const res = await fetch(`/api/staff/communications/intake-fields?clinicId=${clinicId}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ label: newFieldLabel.trim(), fieldType: newFieldType }),
                      });
                      if (!res.ok) throw new Error("Failed to add field");
                      const data = await res.json();
                      setIntakeFields((prev) => [...prev, data.data]);
                      setNewFieldLabel("");
                      toast.success("Field added");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to add field");
                    }
                  }}
                >
                  <Plus className="size-4 mr-1" />
                  Add
                </Button>
              </div>

              {intakeFields.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">No intake fields yet. Add one above.</p>
              )}

              <div className="space-y-2">
                {intakeFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
                    <GripVertical className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{field.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{field.fieldType}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox
                          checked={field.required}
                          onCheckedChange={async (checked) => {
                            const prev = [...intakeFields];
                            setIntakeFields((prev) =>
                              prev.map((f) => (f.id === field.id ? { ...f, required: !!checked } : f))
                            );
                            try {
                              await fetch(`/api/staff/communications/intake-fields/${field.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ required: !!checked }),
                              });
                            } catch {
                              setIntakeFields(prev);
                            }
                          }}
                        />
                        Required
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/staff/communications/intake-fields/${field.id}`, { method: "DELETE" });
                            if (!res.ok) throw new Error("Failed to delete");
                            setIntakeFields((prev) => prev.filter((f) => f.id !== field.id));
                            toast.success("Field deleted");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to delete");
                          }
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
