import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
