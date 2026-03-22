interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
        <span className="text-secondary text-xl">○</span>
      </div>
      <p className="text-on-surface font-medium mb-1">{title}</p>
      {description && <p className="text-secondary text-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
