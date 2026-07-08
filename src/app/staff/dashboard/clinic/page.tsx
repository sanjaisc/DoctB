"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Shield,
  Image,
  Plus,
  X,
  ChevronDown,
  Loader2,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/staff/PageHeader";
import { ImageCropper } from "@/components/staff/ImageCropper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { DoctASessionUser } from "@/lib/auth";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

interface ClinicData {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  about: string | null;
  phoneNumber: string;
  email: string | null;
  website: string | null;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  logoUrl: string | null;
  coverImageUrl: string | null;
  galleryUrls: string | null;
  hoursOfOperation: string | null;
  faq: string | null;
  commonInstructions: string | null;
  status: string;
  inPersonDepositCents: number;
  videoDepositCents: number;
  selfPayFlatRateCents: number;
  cancellationLeadTimeMin: number;
  inPersonCancellationLeadTimeMin: number;
  videoCancellationLeadTimeMin: number;
  reschedulePolicy: string;
  intakeReminderDays: string;
  mapEmbedUrl: string | null;
  emailFromName: string | null;
  customEmailHeader: string | null;
}

interface AmenityItem {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface LanguageItem {
  id: string;
  name: string;
  code: string;
}

interface FAQItem {
  q: string;
  a: string;
}

interface DayHours {
  ranges: { open: string; close: string }[];
  closed: boolean;
}

type WeekHours = Record<string, DayHours>;

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

const DEFAULT_WEEK: WeekHours = {
  mon: { ranges: [{ open: "09:00", close: "17:00" }], closed: false },
  tue: { ranges: [{ open: "09:00", close: "17:00" }], closed: false },
  wed: { ranges: [{ open: "09:00", close: "17:00" }], closed: false },
  thu: { ranges: [{ open: "09:00", close: "17:00" }], closed: false },
  fri: { ranges: [{ open: "09:00", close: "17:00" }], closed: false },
  sat: { ranges: [{ open: "09:00", close: "13:00" }], closed: true },
  sun: { ranges: [{ open: "09:00", close: "17:00" }], closed: true },
};

// Normalize legacy hours format (single open/close) to ranges format
function normalizeWeekHours(data: Record<string, unknown>): WeekHours {
  const result: WeekHours = {};
  for (const key of DAY_KEYS) {
    const dayData = data[key] as Record<string, unknown> | undefined;
    if (!dayData || dayData.closed === undefined) {
      result[key] = DEFAULT_WEEK[key];
      continue;
    }
    if (dayData.ranges && Array.isArray(dayData.ranges)) {
      result[key] = dayData as unknown as DayHours;
    } else {
      result[key] = {
        ranges: dayData.open ? [{ open: dayData.open as string, close: dayData.close as string }] : [],
        closed: dayData.closed as boolean,
      };
    }
  }
  return result;
}

export default function ClinicProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as DoctASessionUser | undefined;
  const clinicId = user?.clinicId as string | undefined;

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clinic data
  const [clinic, setClinic] = useState<ClinicData | null>(null);

  // Form fields — core
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  // Location
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Media
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [showLogoCropper, setShowLogoCropper] = useState(false);
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [showGalleryCropper, setShowGalleryCropper] = useState(false);

  // Patient experience
  const [commonInstructions, setCommonInstructions] = useState("");
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);

  // Hours
  const [weekHours, setWeekHours] = useState<WeekHours>(DEFAULT_WEEK);

  // Financial
  const [inPersonDepositCents, setInPersonDepositCents] = useState(2500);
  const [videoDepositCents, setVideoDepositCents] = useState(0);
  const [selfPayFlatRateCents, setSelfPayFlatRateCents] = useState(0);
  const [inPersonCancellationLeadTimeMin, setInPersonCancellationLeadTimeMin] = useState(1440);
  const [videoCancellationLeadTimeMin, setVideoCancellationLeadTimeMin] = useState(120);
  const [reschedulePolicy, setReschedulePolicy] = useState("FORFEIT_ON_LATE_RESCHEDULE");
  const [mapEmbedUrl, setMapEmbedUrl] = useState("");

  // Languages & Amenities
  const [allLanguages, setAllLanguages] = useState<LanguageItem[]>([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<Set<string>>(new Set());
  const [allAmenities, setAllAmenities] = useState<AmenityItem[]>([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<Set<string>>(new Set());

  // FAQ management
  const addFaqItem = () => setFaqItems([...faqItems, { q: "", a: "" }]);
  const removeFaqItem = (idx: number) => setFaqItems(faqItems.filter((_, i) => i !== idx));
  const updateFaqItem = (idx: number, field: keyof FAQItem, value: string) => {
    setFaqItems(faqItems.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  // Hours management
  const updateDayHours = (day: string, rangeIdx: number | null, field: string, value: string | boolean) => {
    setWeekHours((prev) => {
      const dayData = { ...prev[day] };
      if (rangeIdx === null) {
        (dayData as Record<string, unknown>)[field] = value;
      } else {
        const ranges = [...dayData.ranges];
        ranges[rangeIdx] = { ...ranges[rangeIdx], [field]: value };
        dayData.ranges = ranges;
      }
      return { ...prev, [day]: dayData };
    });
  };
  const addDayRange = (day: string) => {
    setWeekHours((prev) => {
      const dayData = { ...prev[day] };
      dayData.ranges = [...dayData.ranges, { open: "13:00", close: "17:00" }];
      return { ...prev, [day]: dayData };
    });
  };
  const removeDayRange = (day: string, rangeIdx: number) => {
    setWeekHours((prev) => {
      const dayData = { ...prev[day] };
      dayData.ranges = dayData.ranges.filter((_, i) => i !== rangeIdx);
      return { ...prev, [day]: dayData };
    });
  };

  // Gallery management
  const addGalleryImage = (base64: string) => {
    setGalleryUrls([...galleryUrls, base64]);
    setShowGalleryCropper(false);
  };
  const removeGalleryImage = (idx: number) => {
    setGalleryUrls(galleryUrls.filter((_, i) => i !== idx));
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const [clinicRes, languagesRes, amenitiesRes] = await Promise.all([
        fetch(`/api/staff/clinic-info?clinicId=${clinicId}`),
        fetch(`/api/taxonomies`),
        fetch(`/api/taxonomies`),
      ]);

      if (!clinicRes.ok) throw new Error("Failed to load clinic data");
      const clinicData: ClinicData = await clinicRes.json();
      setClinic(clinicData);
      setName(clinicData.name || "");
      setTagline(clinicData.tagline || "");
      setAbout(clinicData.about || "");
      setPhoneNumber(clinicData.phoneNumber || "");
      setEmail(clinicData.email || "");
      setWebsite(clinicData.website || "");
      setStreetAddress(clinicData.streetAddress || "");
      setCity(clinicData.city || "");
      setState(clinicData.state || "");
      setZipCode(clinicData.zipCode || "");
      setLatitude(clinicData.latitude?.toString() || "");
      setLongitude(clinicData.longitude?.toString() || "");
      setLogoUrl(clinicData.logoUrl || null);
      setCoverImageUrl(clinicData.coverImageUrl || null);
      if (clinicData.galleryUrls) {
        try { setGalleryUrls(JSON.parse(clinicData.galleryUrls)); } catch { setGalleryUrls([]); }
      }
      setCommonInstructions(clinicData.commonInstructions || "");
      if (clinicData.faq) {
        try { setFaqItems(JSON.parse(clinicData.faq)); } catch { setFaqItems([]); }
      }
      if (clinicData.hoursOfOperation) {
        try { setWeekHours(normalizeWeekHours(JSON.parse(clinicData.hoursOfOperation))); } catch { /* keep defaults */ }
      }
      setInPersonDepositCents(clinicData.inPersonDepositCents);
      setVideoDepositCents(clinicData.videoDepositCents);
      setSelfPayFlatRateCents(clinicData.selfPayFlatRateCents);
      setInPersonCancellationLeadTimeMin(clinicData.inPersonCancellationLeadTimeMin ?? 1440);
      setVideoCancellationLeadTimeMin(clinicData.videoCancellationLeadTimeMin ?? 120);
      setReschedulePolicy(clinicData.reschedulePolicy || "FORFEIT_ON_LATE_RESCHEDULE");
      setMapEmbedUrl(clinicData.mapEmbedUrl || "");

      // Parse languages/amenities (separate query would be better, but using taxonomies)
      try {
        const langRes = await fetch(`/api/staff/clinic-info/languages?clinicId=${clinicId}`);
        if (langRes.ok) {
          const langData = await langRes.json();
          setAllLanguages(langData.all || []);
          setSelectedLanguageIds(new Set<string>((langData.selected || []).map((l: LanguageItem) => l.id)));
        }
      } catch {}

      try {
        const amenRes = await fetch(`/api/staff/clinic-info/amenities?clinicId=${clinicId}`);
        if (amenRes.ok) {
          const amenData = await amenRes.json();
          setAllAmenities(amenData.all || []);
          setSelectedAmenityIds(new Set<string>((amenData.selected || []).map((a: AmenityItem) => a.id)));
        }
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Save clinic profile
  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      const body = {
        name,
        tagline,
        about,
        phoneNumber,
        email,
        website,
        streetAddress,
        city,
        state,
        zipCode,
        latitude: latitude ? parseFloat(latitude) : 0,
        longitude: longitude ? parseFloat(longitude) : 0,
        logoUrl,
        coverImageUrl,
        galleryUrls: JSON.stringify(galleryUrls),
        hoursOfOperation: JSON.stringify(weekHours),
        faq: JSON.stringify(faqItems),
        commonInstructions,
        inPersonDepositCents,
        videoDepositCents,
        selfPayFlatRateCents,
        inPersonCancellationLeadTimeMin,
        videoCancellationLeadTimeMin,
        reschedulePolicy,
        mapEmbedUrl,
      };
      const res = await fetch(`/api/staff/clinic-info?clinicId=${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      toast.success("Clinic profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Save languages
  const handleSaveLanguages = async () => {
    try {
      const res = await fetch(`/api/staff/clinic-info/languages?clinicId=${clinicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageIds: Array.from(selectedLanguageIds) }),
      });
      if (!res.ok) throw new Error("Failed to update languages");
      toast.success("Languages updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update languages");
    }
  };

  // Save amenities
  const handleSaveAmenities = async () => {
    try {
      const res = await fetch(`/api/staff/clinic-info/amenities?clinicId=${clinicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amenityIds: Array.from(selectedAmenityIds) }),
      });
      if (!res.ok) throw new Error("Failed to update amenities");
      toast.success("Amenities updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update amenities");
    }
  };

  const toggleLanguage = (id: string) => {
    setSelectedLanguageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="space-y-6">
        <PageHeader title="Clinic Profile" description="Manage your clinic's information and branding" />
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-red-800">Failed to load clinic data</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in-0 duration-300">
      <PageHeader
        title="Clinic Profile"
        description="Manage your clinic's information, branding, and configuration"
      >
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
          Save Changes
        </Button>
      </PageHeader>

      {/* Core Details */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Building2 className="size-4 text-emerald-600" />
            </div>
            <CardTitle className="text-base">Core Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Clinic Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tagline">Tagline / Short Summary</Label>
              <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="about">About</Label>
            <Textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} rows={4} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin className="size-4 text-blue-600" />
            </div>
            <CardTitle className="text-base">Location</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="street">Street Address</Label>
            <Input id="street" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="state"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map((st) => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
            </div>
          </div>

          <div className="border border-border/50 rounded-lg p-3 bg-muted/10">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Map Preview</p>
            {latitude && longitude && parseFloat(latitude) && parseFloat(longitude) ? (
              <div className="rounded-lg overflow-hidden border border-border/40">
                <iframe
                  title="Clinic location"
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Save latitude and longitude to see a map preview.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Media */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Image className="size-4 text-purple-600" />
            </div>
            <CardTitle className="text-base">Media</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-5">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo (1:1 square)</Label>
            {showLogoCropper ? (
              <ImageCropper
                aspect={1}
                maxSizeMB={5}
                onCropComplete={(base64) => { setLogoUrl(base64); setShowLogoCropper(false); }}
                onCancel={() => setShowLogoCropper(false)}
              />
            ) : logoUrl ? (
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Logo" className="size-20 rounded-xl object-cover border" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowLogoCropper(true)} className="">
                    Replace
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLogoUrl(null)} className="text-red-600">
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowLogoCropper(true)} className="">
                Upload Logo
              </Button>
            )}
          </div>

          {/* Cover Image */}
          <Separator />
          <div className="space-y-2">
            <Label>Cover Image (16:9 wide)</Label>
            {showCoverCropper ? (
              <ImageCropper
                aspect={16 / 9}
                maxSizeMB={5}
                onCropComplete={(base64) => { setCoverImageUrl(base64); setShowCoverCropper(false); }}
                onCancel={() => setShowCoverCropper(false)}
              />
            ) : coverImageUrl ? (
              <div className="space-y-2">
                <img src={coverImageUrl} alt="Cover" className="w-full max-h-40 rounded-xl object-cover border" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCoverCropper(true)} className="">
                    Replace
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCoverImageUrl(null)} className="text-red-600">
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowCoverCropper(true)} className="">
                Upload Cover Image
              </Button>
            )}
          </div>

          {/* Gallery */}
          <Separator />
          <div className="space-y-2">
            <Label>Gallery Photos (16:9)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {galleryUrls.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-24 rounded-lg object-cover border" />
                  <button
                    onClick={() => removeGalleryImage(idx)}
                    className="absolute top-1 right-1 size-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {showGalleryCropper ? (
                <div className="col-span-full">
                  <ImageCropper
                    aspect={16 / 9}
                    maxSizeMB={5}
                    onCropComplete={addGalleryImage}
                    onCancel={() => setShowGalleryCropper(false)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowGalleryCropper(true)}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-emerald-300 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  <Plus className="size-5" />
                  <span className="text-xs">Add Photo</span>
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hours of Operation */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="size-4 text-amber-600" />
            </div>
            <CardTitle className="text-base">Hours of Operation</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-1">
            {Object.entries(weekHours).map(([day, hours]) => (
              <div key={day} className="py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-foreground shrink-0">{DAY_LABELS[day] || day}</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={!hours.closed}
                      onCheckedChange={(checked) => updateDayHours(day, null, "closed", checked !== true)}
                    />
                    <span className="text-xs text-muted-foreground">Open</span>
                  </label>
                  {!hours.closed && (
                    <button
                      type="button"
                      onClick={() => addDayRange(day)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                    >
                      + Add Range
                    </button>
                  )}
                </div>
                {!hours.closed && hours.ranges.map((range, ridx) => (
                  <div key={ridx} className="flex items-center gap-2 mt-1.5 ml-[5.5rem]">
                    <Input
                      type="time"
                      value={range.open}
                      onChange={(e) => updateDayHours(day, ridx, "open", e.target.value)}
                      className="h-8 w-28 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={range.close}
                      onChange={(e) => updateDayHours(day, ridx, "close", e.target.value)}
                      className="h-8 w-28 text-xs"
                    />
                    {hours.ranges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDayRange(day, ridx)}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Patient Experience */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-sky-100 flex items-center justify-center">
              <Building2 className="size-4 text-sky-600" />
            </div>
            <CardTitle className="text-base">Patient Experience</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="instructions">Parking & Arrival Instructions</Label>
            <Textarea
              id="instructions"
              value={commonInstructions}
              onChange={(e) => setCommonInstructions(e.target.value)}
              rows={3}
              placeholder="e.g., Park in the rear lot. Enter through the side door. Arrive 10 minutes early."
            />
          </div>

          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Frequently Asked Questions</Label>
              <Button variant="outline" size="sm" onClick={addFaqItem} className="">
                <Plus className="size-3.5 mr-1" /> Add FAQ
              </Button>
            </div>
            {faqItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No FAQs yet. Click "Add FAQ" to add one.</p>
            )}
            {faqItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">FAQ #{idx + 1}</span>
                  <button onClick={() => removeFaqItem(idx)} className="text-red-500 hover:text-red-700 cursor-pointer">
                    <X className="size-3.5" />
                  </button>
                </div>
                <Input
                  placeholder="Question"
                  value={item.q}
                  onChange={(e) => updateFaqItem(idx, "q", e.target.value)}
                />
                <Textarea
                  placeholder="Answer"
                  value={item.a}
                  onChange={(e) => updateFaqItem(idx, "a", e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Languages & Amenities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Globe className="size-4 text-indigo-600" />
                </div>
                <CardTitle className="text-base">Languages</CardTitle>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveLanguages}>
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {allLanguages.map((lang) => {
                const selected = selectedLanguageIds.has(lang.id);
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => toggleLanguage(lang.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      selected
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-background text-muted-foreground border-border hover:border-emerald-200"
                    }`}
                  >
                    {lang.name}
                  </button>
                );
              })}
              {allLanguages.length === 0 && (
                <p className="text-sm text-muted-foreground">No languages available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-teal-100 flex items-center justify-center">
                  <Building2 className="size-4 text-teal-600" />
                </div>
                <CardTitle className="text-base">Amenities</CardTitle>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveAmenities}>
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {allAmenities.map((amenity) => {
                const selected = selectedAmenityIds.has(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => toggleAmenity(amenity.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      selected
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-background text-muted-foreground border-border hover:border-emerald-200"
                    }`}
                  >
                    {amenity.icon && <span className="mr-1">{amenity.icon}</span>}
                    {amenity.name}
                  </button>
                );
              })}
              {allAmenities.length === 0 && (
                <p className="text-sm text-muted-foreground">No amenities available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Configuration */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Shield className="size-4 text-emerald-600" />
            </div>
            <CardTitle className="text-base">Financial & Policy Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inPersonDeposit">In-Person Deposit ($)</Label>
              <Input
                id="inPersonDeposit"
                type="number"
                min={0}
                value={(inPersonDepositCents / 100).toFixed(0)}
                onChange={(e) => setInPersonDepositCents(Math.round(parseFloat(e.target.value || "0") * 100))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="videoDeposit">Video Deposit ($)</Label>
              <Input
                id="videoDeposit"
                type="number"
                min={0}
                value={(videoDepositCents / 100).toFixed(0)}
                onChange={(e) => setVideoDepositCents(Math.round(parseFloat(e.target.value || "0") * 100))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="selfPayRate">Self-Pay Flat Rate ($)</Label>
              <Input
                id="selfPayRate"
                type="number"
                min={0}
                value={(selfPayFlatRateCents / 100).toFixed(0)}
                onChange={(e) => setSelfPayFlatRateCents(Math.round(parseFloat(e.target.value || "0") * 100))}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inPersonCancelLead">In-Person Cancellation Lead Time (minutes)</Label>
              <Input
                id="inPersonCancelLead"
                type="number"
                min={0}
                value={inPersonCancellationLeadTimeMin}
                onChange={(e) => setInPersonCancellationLeadTimeMin(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                {(inPersonCancellationLeadTimeMin / 60).toFixed(0)}h {inPersonCancellationLeadTimeMin % 60}m
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="videoCancelLead">Telehealth Cancellation Lead Time (minutes)</Label>
              <Input
                id="videoCancelLead"
                type="number"
                min={0}
                value={videoCancellationLeadTimeMin}
                onChange={(e) => setVideoCancellationLeadTimeMin(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                {(videoCancellationLeadTimeMin / 60).toFixed(0)}h {videoCancellationLeadTimeMin % 60}m
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reschedulePolicy">Reschedule Policy</Label>
              <Select value={reschedulePolicy} onValueChange={setReschedulePolicy}>
                <SelectTrigger id="reschedulePolicy" className=""><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FORFEIT_ON_LATE_RESCHEDULE">Forfeit on Late Reschedule</SelectItem>
                  <SelectItem value="TRANSFER_ON_LATE_RESCHEDULE">Transfer on Late Reschedule</SelectItem>
                  <SelectItem value="ALLOW_1_GRACE_TRANSFER">Allow 1 Grace Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom save button */}
      <div className="flex justify-end pt-2 pb-8">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px]"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}
