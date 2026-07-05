import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center py-1">
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}