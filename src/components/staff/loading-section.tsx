import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSectionProps {
  rows?: number;
  height?: string;
  className?: string;
}

export function LoadingSection({
  rows = 1,
  height = "h-64",
  className,
}: LoadingSectionProps) {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`${height} rounded-xl ${i > 0 ? "mt-2" : ""}`} />
      ))}
    </div>
  );
}
