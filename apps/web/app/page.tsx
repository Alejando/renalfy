import Link from 'next/link';

export default function RenafyLanding() {
  return (
    <div className="min-h-screen flex flex-col bg-surface font-body text-on-surface antialiased">

      {/* Nav */}
      <header className="h-16 px-8 flex items-center justify-between bg-surface/90 backdrop-blur-sm sticky top-0 z-50 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #00647c, #007f9d)' }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v14M3 10h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-headline text-xl font-extrabold tracking-tight text-primary">Renalfy</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#producto" className="text-sm text-secondary font-medium hover:text-primary transition-colors">
            Producto
          </a>
          <a href="#por-que" className="text-sm text-secondary font-medium hover:text-primary transition-colors">
            ¿Por qué Renalfy?
          </a>
          <a href="#contacto" className="text-sm text-secondary font-medium hover:text-primary transition-colors">
            Contacto
          </a>
        </nav>

        <Link
          href="/login"
          className="text-sm font-bold text-on-primary px-5 py-2 rounded-lg transition-all hover:opacity-90 hidden sm:block"
          style={{ background: 'linear-gradient(135deg, #00647c, #007f9d)' }}
        >
          Acceder a mi clínica
        </Link>
      </header>

      <main className="flex-1">

        {/* Hero */}
        <section className="relative overflow-hidden bg-surface pt-24 pb-32 px-8 md:px-24 text-center">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl opacity-40"
              style={{ background: 'radial-gradient(ellipse, #00647c18 0%, transparent 70%)' }}
            />
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
              style={{ background: '#00647c14', color: '#00647c' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Plataforma clínica SaaS · México
            </span>

            {/* Headline */}
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-surface leading-[1.08] mb-6">
              Gestión clínica
              <br />
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(135deg, #00647c, #007f9d)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                de alto nivel.
              </span>
            </h1>

            <p className="text-secondary text-xl md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto mb-10">
              Pacientes, citas, recibos e inventario — todo en un solo lugar,
              diseñado para la nefrología moderna.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/login"
                className="text-on-primary font-headline font-bold text-lg px-8 py-4 rounded-xl transition-all hover:opacity-90 shadow-lg inline-flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #00647c, #007f9d)' }}
              >
                Acceder a mi clínica
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="mailto:hola@renalfy.app"
                className="text-primary font-headline font-bold text-lg px-8 py-4 rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-all inline-flex items-center justify-center gap-2"
              >
                Solicitar demo
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                { icon: '🛡', label: 'Datos en México' },
                { icon: '✓', label: 'NOM-004 Compliant' },
                { icon: '🔒', label: 'AES-256 Encrypted' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-secondary font-medium">
                  <span className="text-primary text-base">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="producto" className="py-24 px-8 md:px-24 bg-surface-container-low">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="block text-xs font-bold uppercase tracking-widest text-primary mb-4">
                Plataforma
              </span>
              <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface mb-4">
                Todo lo que tu clínica necesita
              </h2>
              <p className="text-secondary text-lg max-w-xl mx-auto">
                Un ecosistema completo adaptado al flujo real de una clínica de diálisis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  title: 'Pacientes',
                  desc: 'Expediente clínico electrónico completo. Historial, mediciones y documentos en un solo lugar.',
                  color: '#00647c',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ),
                },
                {
                  title: 'Citas y sesiones',
                  desc: 'Calendario de sesiones con formulario clínico dinámico adaptado a cada tipo de tratamiento.',
                  color: '#00647c',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  ),
                },
                {
                  title: 'Recibos',
                  desc: 'Folio automático por sucursal, control de estados y múltiples tipos de pago.',
                  color: '#00647c',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="15" y2="17" />
                    </svg>
                  ),
                },
                {
                  title: 'Inventario',
                  desc: 'Control de stock por sucursal, órdenes de compra y movimientos en tiempo real.',
                  color: '#00647c',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  ),
                },
                {
                  title: 'Multi-sucursal',
                  desc: 'Gestiona varias sucursales desde un solo tenant. Roles y permisos granulares por ubicación.',
                  color: '#00647c',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  ),
                },
                {
                  title: 'NOM-004',
                  desc: 'Expediente clínico electrónico conforme a la norma mexicana. Auditoría y trazabilidad completa.',
                  color: '#00647c',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                },
              ].map(({ title, desc, icon }) => (
                <div
                  key={title}
                  className="bg-surface-container-lowest p-7 rounded-xl group hover:shadow-md transition-all duration-200"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 text-primary"
                    style={{ background: '#00647c12' }}
                  >
                    {icon}
                  </div>
                  <h3 className="font-headline font-bold text-on-surface text-base mb-2">{title}</h3>
                  <p className="text-secondary text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why */}
        <section id="por-que" className="py-24 px-8 md:px-24 bg-surface">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              {/* Left — editorial statement */}
              <div className="md:w-[55%]">
                <span className="block text-xs font-bold uppercase tracking-widest text-primary mb-6">
                  ¿Por qué Renalfy?
                </span>
                <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface leading-[1.1] mb-6">
                  Construido para el sistema de salud mexicano.
                </h2>
                <p className="text-secondary text-lg leading-relaxed">
                  Cumplimiento LFPDPPP, NOM-004-SSA3 y NOM-024-SSA3. Tus datos
                  residen en México, encriptados en reposo y en tránsito.
                </p>
              </div>

              {/* Right — compliance grid */}
              <div className="md:w-[45%] grid grid-cols-2 gap-4">
                {[
                  { label: 'LFPDPPP', sub: 'Protección de datos personales' },
                  { label: 'NOM-004', sub: 'Expediente clínico electrónico' },
                  { label: 'NOM-024', sub: 'Sistemas de información de salud' },
                  { label: 'AES-256', sub: 'Encriptación en reposo' },
                ].map(({ label, sub }) => (
                  <div
                    key={label}
                    className="p-5 rounded-xl"
                    style={{ background: '#00647c0a' }}
                  >
                    <p className="font-headline font-extrabold text-primary text-xl mb-1">{label}</p>
                    <p className="text-secondary text-xs leading-tight">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          id="contacto"
          className="py-24 px-8 md:px-24 text-center"
          style={{ background: 'linear-gradient(135deg, #00647c, #007f9d)' }}
        >
          <div className="max-w-2xl mx-auto">
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-primary mb-4">
              ¿Listo para modernizar tu clínica?
            </h2>
            <p className="text-on-primary/80 text-lg mb-10">
              Contáctanos para una demo personalizada o accede directamente si ya tienes una cuenta.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="bg-on-primary text-primary font-headline font-bold text-lg px-8 py-4 rounded-xl hover:opacity-90 transition-all inline-flex items-center justify-center gap-2"
              >
                Acceder a mi clínica
              </Link>
              <a
                href="mailto:hola@renalfy.app"
                className="border-2 border-on-primary/30 text-on-primary font-headline font-bold text-lg px-8 py-4 rounded-xl hover:border-on-primary/60 transition-all inline-flex items-center justify-center gap-2"
              >
                Solicitar demo
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-16 px-8 flex items-center justify-between bg-surface border-t border-outline-variant/20">
        <nav className="flex items-center gap-6">
          <Link
            href="/privacidad"
            className="text-[10px] font-bold text-outline uppercase tracking-[0.15em] hover:text-primary transition-colors"
          >
            Política de privacidad
          </Link>
          <Link
            href="/terminos"
            className="text-[10px] font-bold text-outline uppercase tracking-[0.15em] hover:text-primary transition-colors"
          >
            Términos de servicio
          </Link>
          <Link
            href="/contacto"
            className="text-[10px] font-bold text-outline uppercase tracking-[0.15em] hover:text-primary transition-colors"
          >
            Soporte
          </Link>
        </nav>
        <p className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">
          © 2026 Renalfy Cloud Systems
        </p>
      </footer>
    </div>
  );
}
