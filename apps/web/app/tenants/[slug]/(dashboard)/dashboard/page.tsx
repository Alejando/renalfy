export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface font-headline">Panel de control</h1>
        <p className="text-secondary text-sm mt-1">Bienvenido a Renalfy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['Pacientes activos', 'Citas hoy', 'Recibos pendientes'] as const).map((label) => (
          <div key={label} className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary font-label">
              {label}
            </p>
            <p className="text-3xl font-bold text-on-surface mt-2 font-headline">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
