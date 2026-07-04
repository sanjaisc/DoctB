"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  MapPin,
  Heart,
  User,
  Baby,
  Clock,
  Navigation,
  Stethoscope,
  AlertCircle,
  Loader2,
  X,
  Phone,
  LocateFixed,
  LocateOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { ProviderCard } from "@/components/search/provider-card";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TaxonomySpecialty {
  id: string;
  name: string;
  slug: string;
}

interface TaxonomyInsurance {
  id: string;
  name: string;
  slug: string;
  isDemo: boolean;
}

interface ProviderSlot {
  id: string;
  startTime: string;
  endTime: string;
  modality: string;
}

interface ProviderResult {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  credentials: string | null;
  photoUrl: string | null;
  rating: number;
  reviewCount: number;
  slotDurationMinutes: number;
  clinic: {
    id: string;
    slug: string;
    name: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    phoneNumber: string;
    logoUrl: string | null;
  };
  distance: number | null;
  earliestSlots: ProviderSlot[];
  reviewSnippet: string | null;
  costBadge: string | null;
}

interface SearchResponse {
  providers: ProviderResult[];
  hasMore: boolean;
  total: number;
}

// -----------------------------------------------------------------------------
// Search Helpers
// -----------------------------------------------------------------------------

interface SearchParams {
  specialtyId: string;
  patientType: string;
  q?: string;
  insuranceId?: string;
  modality?: string;
  radius: number;
  lat?: number;
  lng?: number;
  sort: string;
  cursor: number;
  size: number;
}

function buildFetchUrl(params: SearchParams): string {
  const sp = new URLSearchParams();
  sp.set("specialtyId", params.specialtyId);
  sp.set("patientType", params.patientType);
  if (params.q) sp.set("q", params.q);
  if (params.insuranceId) sp.set("insuranceId", params.insuranceId);
  if (params.modality) sp.set("modality", params.modality);
  sp.set("radius", String(params.radius));
  if (params.lat != null) sp.set("lat", String(params.lat));
  if (params.lng != null) sp.set("lng", String(params.lng));
  sp.set("sort", params.sort);
  sp.set("cursor", String(params.cursor));
  sp.set("size", String(params.size));
  return `/api/search/providers?${sp.toString()}`;
}

// =============================================================================
// Component
// =============================================================================

export function SearchPage() {
  // ---- Taxonomy Data ----
  const [specialties, setSpecialties] = useState<TaxonomySpecialty[]>([]);
  const [insurances, setInsurances] = useState<TaxonomyInsurance[]>([]);

  // ---- Filter State ----
  const [query, setQuery] = useState("");
  const [specialtyId, setSpecialtyId] = useState<string | null>(null);
  const [patientType, setPatientType] = useState<"ADULT" | "PEDIATRIC">("ADULT");
  const [insuranceId, setInsuranceId] = useState("");
  const [modality, setModality] = useState<"IN_PERSON" | "VIDEO" | "">("");
  const [radius, setRadius] = useState(5);
  const [sort, setSort] = useState<"distance" | "time">("distance");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  // ---- Results State ----
  const [results, setResults] = useState<ProviderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searched, setSearched] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch Taxonomies on Mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function fetchTaxonomies() {
      try {
        const res = await fetch("/api/taxonomies");
        if (!res.ok) return;
        const data = await res.json();
        setSpecialties(data.specialties ?? []);
        setInsurances(data.insurances ?? []);
      } catch {
        // Silently fail
      }
    }
    fetchTaxonomies();

    // Attempt browser geolocation (non-blocking)
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setGeoStatus("granted");
        },
        () => setGeoStatus("denied"),
        { timeout: 5000 }
      );
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Build search params from current state + optional overrides
  // ---------------------------------------------------------------------------
  const getSearchParams = useCallback(
    (overrides?: Partial<SearchParams>): SearchParams => {
      return {
        specialtyId: overrides?.specialtyId ?? specialtyId ?? "",
        patientType: overrides?.patientType ?? patientType,
        q: overrides?.q ?? (query.trim() || undefined),
        insuranceId: (overrides?.insuranceId ?? insuranceId) || undefined,
        modality: (overrides?.modality ?? modality) || undefined,
        radius: overrides?.radius ?? radius,
        lat: userLat ?? undefined,
        lng: userLng ?? undefined,
        sort: overrides?.sort ?? sort,
        cursor: overrides?.cursor ?? 0,
        size: 10,
      };
    },
    [query, specialtyId, patientType, insuranceId, modality, radius, sort, userLat, userLng]
  );

  // ---------------------------------------------------------------------------
  // Primary Search (fresh results)
  // ---------------------------------------------------------------------------
  const executeSearch = useCallback(
    async (overrides?: Partial<SearchParams>) => {
      const params = getSearchParams(overrides);
      if (!params.specialtyId) return;

      setLoading(true);
      setResults([]);
      setCursor(0);
      setError(null);
      setSearched(true);
      setInitialLoad(false);

      try {
        const res = await fetch(buildFetchUrl(params));
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data: SearchResponse = await res.json();
        setResults(data.providers);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setCursor(data.providers.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [getSearchParams]
  );

  // ---------------------------------------------------------------------------
  // Load More (append results)
  // ---------------------------------------------------------------------------
  const onLoadMore = useCallback(async () => {
    if (loadingMore) return;

    const params = getSearchParams({ cursor });
    setLoadingMore(true);

    try {
      const res = await fetch(buildFetchUrl(params));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data: SearchResponse = await res.json();
      setResults((prev) => [...prev, ...data.providers]);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setCursor((prev) => prev + data.providers.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, cursor, getSearchParams]);

  // ---------------------------------------------------------------------------
  // Form Submit
  // ---------------------------------------------------------------------------
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  // ---------------------------------------------------------------------------
  // Smart Suggestion Handlers
  // ---------------------------------------------------------------------------
  const onExpandRadius = () => {
    setRadius(25);
    executeSearch({ radius: 25 });
  };

  const onRemoveInsurance = () => {
    setInsuranceId("");
    executeSearch({ insuranceId: undefined });
  };

  const onRemoveModality = () => {
    setModality("");
    executeSearch({ modality: undefined });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ===== Sticky Header ===== */}
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer">
            <Heart className="size-6 text-emerald-600 fill-emerald-600" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              ClinicBook
            </span>
          </div>
          <Button variant="outline" size="sm" className="cursor-pointer">
            Staff Login
          </Button>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 pb-8 pt-12 md:pt-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Find Your Doctor
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Search for local providers, compare availability, and book an
              appointment in minutes.
            </p>
          </div>

          {/* ===== Search Form ===== */}
          <form onSubmit={onFormSubmit} className="space-y-4 text-left">
            {/* Row 1: Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by doctor name, clinic, or condition..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 pl-10 pr-10 text-base bg-white w-full"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Row 2: Filters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Specialty Select (MANDATORY) */}
              <Select
                value={specialtyId ?? undefined}
                onValueChange={(val) => setSpecialtyId(val)}
              >
                <SelectTrigger className="h-10 w-full bg-white cursor-pointer">
                  <SelectValue placeholder="Select specialty *" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      className="cursor-pointer"
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Patient Type Toggle (MANDATORY) */}
              <div className="flex items-center">
                <ToggleGroup
                  type="single"
                  value={patientType}
                  onValueChange={(val) => {
                    if (val) setPatientType(val as "ADULT" | "PEDIATRIC");
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <ToggleGroupItem
                    value="ADULT"
                    className="flex-1 gap-1.5 cursor-pointer"
                  >
                    <User className="size-3.5" />
                    <span className="text-xs sm:text-sm">Adult</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="PEDIATRIC"
                    className="flex-1 gap-1.5 cursor-pointer"
                  >
                    <Baby className="size-3.5" />
                    <span className="text-xs sm:text-sm">Pediatric</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Insurance Select (optional) */}
              <Select
                value={insuranceId || undefined}
                onValueChange={(val) =>
                  setInsuranceId(val === "__none__" ? "" : val)
                }
              >
                <SelectTrigger className="h-10 w-full bg-white cursor-pointer">
                  <SelectValue placeholder="Any Insurance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="cursor-pointer">
                    Uninsured
                  </SelectItem>
                  {insurances.map((ins) => (
                    <SelectItem
                      key={ins.id}
                      value={ins.id}
                      className="cursor-pointer"
                    >
                      {ins.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Modality Select (optional) */}
              <Select
                value={modality || undefined}
                onValueChange={(val) =>
                  setModality(val as "IN_PERSON" | "VIDEO")
                }
              >
                <SelectTrigger className="h-10 w-full bg-white cursor-pointer">
                  <SelectValue placeholder="Any Visit Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PERSON" className="cursor-pointer">
                    In-Person
                  </SelectItem>
                  <SelectItem value="VIDEO" className="cursor-pointer">
                    Video
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Radius Slider + Sort */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Radius Slider */}
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                {geoStatus === "granted" ? (
                  <LocateFixed className="size-4 text-emerald-600 shrink-0" title="Location detected" />
                ) : (
                  <MapPin className="size-4 text-muted-foreground shrink-0" title="Allow location for distance sorting" />
                )}
                <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[45px]">
                  {radius} mi
                </span>
                <Slider
                  value={[radius]}
                  onValueChange={([val]) => setRadius(val)}
                  min={1}
                  max={50}
                  step={1}
                  className="flex-1 cursor-pointer"
                />
              </div>

              {/* Sort Toggle */}
              <ToggleGroup
                type="single"
                value={sort}
                onValueChange={(val) => {
                  if (val) setSort(val as "distance" | "time");
                }}
                variant="outline"
                className="cursor-pointer"
              >
                <ToggleGroupItem
                  value="distance"
                  className="gap-1.5 cursor-pointer"
                >
                  <Navigation className="size-3.5" />
                  <span className="text-xs sm:text-sm">Nearest</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="time"
                  className="gap-1.5 cursor-pointer"
                >
                  <Clock className="size-3.5" />
                  <span className="text-xs sm:text-sm">Earliest</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Row 4: Search Button */}
            <div className="flex flex-col items-center gap-1.5">
              <Button
                type="submit"
                disabled={!specialtyId || loading}
                className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-base font-medium"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Search Providers
              </Button>
              {!specialtyId && (
                <span className="text-xs text-muted-foreground">
                  Please select a specialty to search
                </span>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* ===== Results Section ===== */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Initial Load — No search yet */}
        {initialLoad && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Stethoscope className="size-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">
              Select a specialty and search to find providers
            </p>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border p-4 space-y-3 bg-card"
              >
                <div className="flex gap-4">
                  <Skeleton className="size-16 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <div className="flex gap-2">
                    <Skeleton className="h-14 w-44 rounded-lg" />
                    <Skeleton className="h-14 w-44 rounded-lg" />
                    <Skeleton className="h-14 w-44 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && searched && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <AlertCircle className="size-10 text-destructive" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Something went wrong
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => executeSearch()}
              className="cursor-pointer"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* No Results + Smart Suggestions */}
        {!loading && !error && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <Search className="size-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              No providers found matching your criteria
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {radius < 25 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExpandRadius}
                  className="cursor-pointer"
                >
                  <MapPin className="size-3.5" />
                  Expand radius to 25 mi?
                </Button>
              )}
              {insuranceId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRemoveInsurance}
                  className="cursor-pointer"
                >
                  Remove insurance filter?
                </Button>
              )}
              {modality && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRemoveModality}
                  className="cursor-pointer"
                >
                  Try all visit types?
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Results List */}
        {!loading && !error && searched && results.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? "provider" : "providers"} found
            </p>

            <div className="space-y-4">
              {results.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="cursor-pointer"
                >
                  {loadingMore && <Loader2 className="size-4 animate-spin" />}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}