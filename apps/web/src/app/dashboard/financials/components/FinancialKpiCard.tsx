'use client';

interface FinancialKpiCardProps {
  label: string;
  value: string;
  subtext?: string;
}

export function FinancialKpiCard({ label, value, subtext }: FinancialKpiCardProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-secondary font-label">
        {label}
      </p>
      <p className="text-3xl font-bold text-on-surface mt-2 font-headline">{value}</p>
      {subtext && <p className="text-sm text-secondary mt-1">{subtext}</p>}
    </div>
  );
}
