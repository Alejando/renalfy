interface PlanProgressBarProps {
  usedSessions: number;
  plannedSessions: number;
}

export function PlanProgressBar({ usedSessions, plannedSessions }: PlanProgressBarProps) {
  const percentage = Math.min(
    plannedSessions > 0 ? (usedSessions / plannedSessions) * 100 : 0,
    100,
  );

  return (
    <div className="space-y-1">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {usedSessions} / {plannedSessions}
      </span>
      <div className="w-full bg-muted rounded-full h-1">
        <div
          className="bg-primary rounded-full h-1 transition-all"
          style={{ width: `${percentage.toString()}%` }}
          role="progressbar"
          aria-valuenow={usedSessions}
          aria-valuemin={0}
          aria-valuemax={plannedSessions}
        />
      </div>
    </div>
  );
}
