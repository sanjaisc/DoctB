import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Tabs */}
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-3 border-b last:border-b-0">
            <Skeleton className="size-8 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-3 w-16 shrink-0 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}