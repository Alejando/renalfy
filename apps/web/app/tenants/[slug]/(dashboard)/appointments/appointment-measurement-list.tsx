import type { MeasurementResponse } from '@repo/types';

interface AppointmentMeasurementListProps {
  measurements: MeasurementResponse[];
}

const LABEL_CLASS =
  'text-[10px] font-label uppercase tracking-widest text-rf-ink-soft font-semibold';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function AppointmentMeasurementList({
  measurements,
}: AppointmentMeasurementListProps) {
  if (measurements.length === 0) {
    return (
      <div
        className="rounded-rf-md p-6"
        style={{
          background: 'var(--rf-surface)',
          border: '1px solid var(--rf-line)',
        }}
      >
        <p className={`${LABEL_CLASS} mb-2`}>Mediciones</p>
        <p className="text-rf-ink-soft text-sm">Sin mediciones registradas.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-rf-md p-6 space-y-4"
      style={{
        background: 'var(--rf-surface)',
        border: '1px solid var(--rf-line)',
      }}
    >
      <p className={LABEL_CLASS}>Mediciones ({measurements.length})</p>
      <div className="space-y-4">
        {measurements.map((measurement) => (
          <div
            key={measurement.id}
            className="rounded-rf p-4 space-y-3"
            style={{
              background: 'var(--rf-surface-sunk)',
              border: '1px solid var(--rf-line)',
            }}
          >
            <p className="text-sm font-semibold text-rf-ink">
              {formatDateTime(measurement.recordedAt)}
            </p>
            {Object.keys(measurement.data).length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries(measurement.data).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <p className={LABEL_CLASS}>{key}</p>
                    <p className="text-sm text-rf-ink font-medium">
                      {String(value ?? '—')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {measurement.notes && (
              <div className="space-y-1">
                <p className={LABEL_CLASS}>Notas</p>
                <p className="text-sm text-rf-ink-soft">{measurement.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
