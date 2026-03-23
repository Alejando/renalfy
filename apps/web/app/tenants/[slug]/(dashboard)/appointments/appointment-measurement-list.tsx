import type { MeasurementResponse } from '@repo/types';

interface AppointmentMeasurementListProps {
  measurements: MeasurementResponse[];
}

const SECTION_LABEL =
  'text-[10px] font-label uppercase tracking-widest text-muted-foreground font-semibold';

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
      <div className="rounded-xl border p-6">
        <p className={`${SECTION_LABEL} mb-3`}>Mediciones</p>
        <p className="text-muted-foreground text-sm">Sin mediciones registradas.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-6 space-y-4">
      <p className={SECTION_LABEL}>Mediciones ({measurements.length})</p>
      <div className="space-y-4">
        {measurements.map((measurement) => (
          <div
            key={measurement.id}
            className="border rounded-lg p-4 space-y-3 bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {formatDateTime(measurement.recordedAt)}
              </p>
            </div>
            {Object.keys(measurement.data).length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries(measurement.data).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <p className={SECTION_LABEL}>{key}</p>
                    <p className="text-sm text-foreground font-medium">
                      {String(value ?? '—')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {measurement.notes && (
              <div className="space-y-1">
                <p className={SECTION_LABEL}>Notas</p>
                <p className="text-sm text-muted-foreground">{measurement.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
