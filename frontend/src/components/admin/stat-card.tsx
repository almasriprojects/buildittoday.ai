import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  onClick?: () => void;
  progress?: number; // 0-100 percentage
  progressLabel?: string;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  hint,
  onClick,
  progress,
  progressLabel,
  loading,
}: StatCardProps) {
  const clickable = !!onClick;
  return (
    <Card
      className={cn(
        "group",
        clickable &&
          "cursor-pointer transition-all hover:border-accent-primary hover:shadow-md hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold">{value}</p>
        </div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        {typeof progress === "number" && (
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            {progressLabel && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {Math.round(progress)}% {progressLabel}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}