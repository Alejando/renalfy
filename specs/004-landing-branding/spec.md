# Feature Specification: Dynamic Landing Page & Tenant Branding

**Feature Branch**: `004-landing-branding`
**Created**: 2026-03-19
**Status**: Draft
**Sprint**: 4

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Visitante ve la landing page de su clínica (Priority: P1)

Como visitante que llega a `clinica-centro.renalfy.app`, quiero ver una página pública con la información y branding de esa clínica, para saber que estoy en el lugar correcto antes de iniciar sesión.

**Why this priority**: Es el primer punto de contacto del usuario final con el producto. Sin esta página, el subdominio sirve un 404 o contenido genérico, lo cual rompe la propuesta de valor multi-tenant.

**Independent Test**: Levantar el dev server con un tenant seeded en la BD, navegar a `localhost:3020` con el header `X-Tenant-Slug: clinica-centro` (simulando el subdominio) y verificar que el nombre, logo y colores de la clínica aparecen en la página.

**Acceptance Scenarios**:

1. **Given** un visitante en `{slug}.renalfy.app`, **When** carga la página, **Then** ve el nombre de la clínica, tagline, teléfono y dirección definidos en `TenantSettings`.
2. **Given** un tenant con `logoUrl` configurado, **When** el visitante carga la landing, **Then** el logo aparece en el header de la página.
3. **Given** un tenant con `primaryColor` configurado, **When** el visitante carga la landing, **Then** el color primario se aplica como variable CSS (`--color-primary`) en el layout.
4. **Given** un slug inexistente (`noexiste.renalfy.app`), **When** el visitante carga la página, **Then** recibe una página `404` descriptiva (no un error de servidor).
5. **Given** un tenant sin `TenantSettings` configurado, **When** el visitante carga la landing, **Then** se muestra la página con valores por defecto (nombre del tenant, sin logo, color primario genérico).

---

### User Story 2 — Middleware resuelve el subdominio al tenant correcto (Priority: P1)

Como sistema, debo identificar el tenant desde el subdominio del request y ponerlo disponible para todas las páginas sin que cada una tenga que hacer esa lógica.

**Why this priority**: Es la infraestructura base de todo el sistema multi-tenant en el frontend. Sin ella, ninguna página sabe a qué tenant pertenece.

**Independent Test**: Enviar un request al middleware con `Host: clinica-centro.renalfy.app` y verificar que el header `x-tenant-slug` llega al Server Component de destino.

**Acceptance Scenarios**:

1. **Given** un request con `Host: clinica-norte.renalfy.app`, **When** el middleware procesa la request, **Then** inyecta `x-tenant-slug: clinica-norte` en los headers hacia el Server Component.
2. **Given** un request con `Host: localhost:3020` (dev), **When** el middleware procesa la request, **Then** no inyecta tenant (o usa un slug de desarrollo configurable).
3. **Given** un request con `Host: renalfy.app` (dominio raíz, sin subdominio), **When** el middleware procesa la request, **Then** redirige a una página de marketing o muestra contenido genérico de la plataforma.
4. **Given** un subdominio válido, **When** el middleware lo detecta, **Then** también inyecta el header `X-Tenant-ID` con el UUID del tenant (necesario para auth en login posterior).

---

### User Story 3 — Endpoint público de branding en el backend (Priority: P1)

Como frontend de Next.js (Server Component), necesito obtener los datos de branding de un tenant dado su slug, sin requerir autenticación, para poder renderizar la landing y el layout.

**Why this priority**: El middleware y el Server Component necesitan datos del tenant antes de que exista un JWT. Debe ser un endpoint público.

**Independent Test**: Llamar `GET /api/public/tenants/{slug}` sin token y verificar que retorna los datos de `TenantSettings` sin exponer datos sensibles.

**Acceptance Scenarios**:

1. **Given** un slug válido, **When** se llama `GET /api/public/tenants/{slug}`, **Then** retorna `200` con `{ name, slug, settings: { logoUrl, primaryColor, secondaryColor, tagline, description, phone, email, address } }`.
2. **Given** un slug inválido, **When** se llama `GET /api/public/tenants/{slug}`, **Then** retorna `404`.
3. **Given** cualquier request sin token, **When** se llama `GET /api/public/tenants/{slug}`, **Then** retorna `200` — no requiere `JwtAuthGuard`.
4. **Given** el endpoint, **When** se llama, **Then** nunca expone: `id` del tenant, emails internos de usuarios, datos de configuración interna.

---

### User Story 4 — OWNER configura el branding de su clínica (Priority: P2)

Como OWNER, quiero actualizar el logo, colores y descripción de mi clínica desde el panel de configuración, para que la landing refleje la identidad visual de mi organización.

**Why this priority**: Sin un endpoint de escritura, el branding solo se puede configurar directamente en BD. P2 porque la landing ya funciona con el endpoint de lectura; la edición puede ir en una iteración posterior dentro del mismo sprint.

**Independent Test**: Llamar `PATCH /api/tenant-settings` autenticado como OWNER con `{ primaryColor: '#1a73e8' }` y verificar que `GET /api/public/tenants/{slug}` retorna el nuevo color.

**Acceptance Scenarios**:

1. **Given** un OWNER autenticado, **When** hace `PATCH /api/tenant-settings` con campos de branding, **Then** retorna `200` con los settings actualizados.
2. **Given** un ADMIN, **When** intenta `PATCH /api/tenant-settings`, **Then** retorna `403 Forbidden`.
3. **Given** el `tenantId` del OWNER en el JWT, **When** actualiza settings, **Then** solo puede modificar los settings de su propio tenant — nunca de otro.

---

### Edge Cases

- Subdominio con guiones o números: `clinica-norte-2.renalfy.app` → slug `clinica-norte-2` debe resolverse correctamente.
- Tenant con `customDomain` configurado: `clinica.com` (dominio propio) → el middleware debe reconocer dominios que no son subdominios de `renalfy.app`.
- `TenantSettings` con `primaryColor` inválido (no hex): el endpoint de escritura valida formato `#RRGGBB` antes de guardar.
- Concurrencia: si dos requests llegan simultáneamente para el mismo slug, ambos deben recibir respuesta correcta (sin race condition en caché).
- Entorno local: en `localhost`, no hay subdominio real — el middleware debe tener un modo de desarrollo con slug configurable via `NEXT_PUBLIC_DEV_TENANT_SLUG`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE resolver el subdominio del hostname en `middleware.ts` e inyectarlo en headers hacia Server Components.
- **FR-002**: El backend DEBE exponer `GET /api/public/tenants/:slug` sin autenticación, retornando datos de `Tenant` + `TenantSettings`.
- **FR-003**: La landing `(landing)/[tenant]/page.tsx` DEBE ser un Server Component que llame al endpoint público y renderice los datos de branding.
- **FR-004**: El sistema DEBE mostrar una página `404` si el slug no corresponde a ningún tenant activo.
- **FR-005**: El color primario del tenant DEBE aplicarse como variable CSS en el layout para que afecte a toda la experiencia visual.
- **FR-006**: El backend DEBE exponer `PATCH /api/tenant-settings` protegido con `@Roles(UserRole.OWNER)` para actualizar branding.
- **FR-007**: El schema de `TenantSettingsSchema` DEBE vivir en `@repo/types` y ser compartido entre backend (validación) y frontend (parseo de respuesta).
- **FR-008**: En desarrollo local, `middleware.ts` DEBE leer `NEXT_PUBLIC_DEV_TENANT_SLUG` como fallback cuando no hay subdominio real.

### Key Entities

- **Tenant**: `id`, `slug`, `name`, `status`. La landing solo se muestra si `status = ACTIVE | TRIAL`.
- **TenantSettings**: `tenantId`, `logoUrl?`, `coverUrl?`, `primaryColor?`, `secondaryColor?`, `tagline?`, `description?`, `phone?`, `email?`, `address?`, `customDomain?`.
- **PublicTenantModule** (backend): módulo NestJS sin guards para el endpoint público de lectura.
- **TenantSettingsModule** (backend): módulo NestJS con `@Roles(OWNER)` para el endpoint de escritura.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `pnpm lint && pnpm check-types && pnpm test` pasan en verde antes de merge.
- **SC-002**: Navegar a un slug válido muestra nombre, tagline y color del tenant — verificado con Vitest + React Testing Library mockeando el fetch.
- **SC-003**: Navegar a un slug inexistente retorna una página `404` — verificado en test de componente.
- **SC-004**: `GET /api/public/tenants/{slug}` sin token retorna `200` — verificado en unit test de `PublicTenantsService`.
- **SC-005**: `PATCH /api/tenant-settings` con rol ADMIN retorna `403` — verificado en unit test de `TenantSettingsService`.
- **SC-006**: El middleware inyecta `x-tenant-slug` correctamente — verificado con unit test del middleware.
