interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Ocurrió un error al cargar los datos.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mb-4">
        <span className="text-on-error-container text-xl">!</span>
      </div>
      <p className="text-on-surface font-medium mb-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-sm text-primary font-semibold hover:underline"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
