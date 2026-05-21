# Roadmap de Sprints — Renalfy

Este documento es el **tracking histórico y planificación futura** del proyecto. Registra qué se ha construido, el estado actual, y qué sigue.

---

## Sprints Completados (✅)

### Sprint 1-11: Fundación (Módulos 1-2)

| Sprint | Módulo | Descripción | Tests | Estado |
|---|---|---|---|---|
| S1-S3 | Auth | JWT (access + refresh), login, logout, password reset | ✅ | Completado |
| S4-S5 | Users | CRUD de usuarios, roles, permisos | ✅ | Completado |
| S6 | Locations | CRUD de sucursales, RLS | ✅ | Completado |
| S7-S8 | Patients | CRUD de pacientes, consentimientos (LFPDPPP) | ✅ | Completado |
| S9 | ServiceTypes | Tipos de servicios clínicos configurables | ✅ | Completado |
| S10 | Appointments | Citas/sesiones con formularios dinámicos | ✅ | Completado |
| S11 | Clinical Templates | Plantillas dinámicas de formularios clínicos | ✅ | Completado |

**Métricas:**
- Autenticación multi-tenant completamente funcional
- RLS en PostgreSQL + filtros de aplicación validados
- Cumplimiento LFPDPPP (consentimientos)

---

### Sprint 12: Receipts UI (Módulo 1)

| Item | Estado |
|---|---|
| **Descripción** | UI para recibos: listar, crear, detalles, transiciones de estado |
| **Backend** | Ya existía de sprints anteriores |
| **Frontend** | Página de recibos, modal crear, tabla detallada |
| **Tests** | ✅ Vitest + RTL |
| **Compliance** | ✅ RLS (MANAGER solo ve su locationId) |

---

### Sprint 13: Companies + Plans Backend

| Item | Estado |
|---|---|
| **Descripción** | Módulo de planes de cobertura |
| **API** | POST/GET /api/companies, POST/GET /api/plans |
| **Business Logic** | Plan.usedSessions incrementa con recibos BENEFIT |
| **Tests** | ✅ 45 unit + E2E tests |
| **Migrations** | Company, Plan models con RLS |

---

### Sprint 14: Companies + Plans UI

| Item | Estado |
|---|---|
| **Descripción** | Páginas y componentes para gestionar planes |
| **Features** | Listar, crear, editar planes; ver detalles de cobertura |
| **Tests** | ✅ Vitest |
| **Compliance** | ✅ RLS validado |

---

### Sprint 15-18: Módulo 3 — Inventario (Backend + UI)

| Sprint | Módulo | Descripción | Tests |
|---|---|---|---|
| S15 | Products | CRUD de productos, categorías | ✅ |
| S16 | Suppliers | CRUD de proveedores, contactos | ✅ |
| S17 | Purchase Orders | Órdenes de compra, estados (PENDING, RECEIVED, CANCELLED) | ✅ |
| S18 | Purchase Orders UI | Página de órdenes, creación, seguimiento | ✅ |

---

### Sprint 19: Purchases + Inventory Movements Backend

| Item | Estado |
|---|---|
| **Descripción** | Recepción de compras y movimientos de inventario |
| **API** | POST /api/purchases, POST /api/inventory-movements |
| **Business Logic** | Stock automático al recibir, movimientos auditados |
| **Tests** | ✅ 67 tests (unit + E2E) |
| **Transactions** | Atómicas: recibir compra + actualizar stock + InventoryMovement |

---

### Sprint 20: Inventory UI (Frontend)

| Item | Estado |
|---|---|
| **Descripción** | UI para inventario: productos, proveedores, compras, movimientos, stock |
| **Pages** | /inventory/products, /inventory/suppliers, /inventory/purchases, /inventory/movements |
| **Components** | Tablas, modales, filtros, detalles |
| **Tests** | ✅ Vitest (tablas, modales, filtros) |
| **Compliance** | ✅ RLS (MANAGER solo ve su locationId) |

---

### Sprint 21: Módulo 4 — Ventas, Ingresos, Egresos, Corte de Caja (Backend)

| Item | Estado |
|---|---|
| **Descripción** | Transacciones financieras atómicas |
| **Modules** | Sales, Income, Expense, CashClose |
| **API** | 15+ endpoints para C/R/U de transacciones |
| **Tests** | ✅ **364 tests** (unit + E2E, todas fases) |
| **Transactions** | Atómicas en Prisma: venta + stock + folio + AuditLog |
| **Business Rules** | Folio secuencial, stock deduction, Plan.usedSessions, CashClose inmutable |
| **Compliance** | AuditLog async, RLS validado, permisos por rol |
| **Status** | ✅ COMPLETADO — código en main listo para integración frontend |

**Estructura de implementación (6 fases):**

```
Fase 1: Schemas (@repo/types) + PrismaService
Fase 2: Sales module (tests + implementation)
Fase 3: Income module (tests + implementation)
Fase 4: Expense module (tests + implementation)
Fase 5: CashClose module (tests + implementation)
Fase 6: Integration tests + edge cases
```

**Validaciones implementadas:**
- Folio único por (tenantId, locationId, año)
- Stock deduction con validación
- Plan.usedSessions incremento
- CashClose locking de transacciones
- RLS por tenant + filtro por locationId para MANAGER
- AuditLog en async (fire-and-forget)
- Permisos: STAFF rechazado, MANAGER por locationId, OWNER/ADMIN acceso total

---

## Sprints Actuales (🔄)

### Sprint 22-23: Módulo 4 — Ventas, Ingresos, Egresos, Corte de Caja (Frontend)

| Item | Estado |
|---|---|
| **Descripción** | UI para transacciones financieras |
| **Pages** | /financials (tab navegable con Sales, Income, Expense, CashClose) |
| **Components** | Tablas de transacciones, modales crear, detail drawers |
| **Implementation** | ~90% completado |
| **Tests** | Vitest + RTL en curso |

**Progress:**
- ✅ Tablas para cada transacción (Sales, Income, Expense, CashClose)
- ✅ Modales de creación con validación Zod + React Hook Form
- ✅ Filtros y búsqueda
- ✅ Detail drawers
- 🔄 Tests finales + edge cases
- 🔄 RLS validation (MANAGER locationId filtering)

**Pendiente:**
- Transición de estado (FINISHED, SETTLED, CANCEL en venta)
- Validaciones de reglas de negocio en UI
- Tests de integración E2E
- Compliance verification

---

## Sprints Planificados (📅)

### Sprint 24: Reports y Analytics UI

| Item | Plan |
|---|---|
| **Descripción** | Exportación de reportes, dashboards de análisis |
| **Features** | Reportes filtrados por fecha/ubicación, PDF con marca de agua |
| **Spec** | /docs/specs/reports.md (pendiente) |
| **Tech** | Next.js Server Components, PDF generation (puppeteer o similar) |
| **Compliance** | Marca de agua con tenantId, sin PHI identificable en exports |
| **Tests** | Vitest (generación, filtros), E2E (PDF visual) |

---

### Sprint 25: QA End-to-End Completo

| Item | Plan |
|---|---|
| **Descripción** | Validación E2E completa de todos los módulos |
| **Scope** | Flujos usuario: login → paciente → cita → recibo → venta → reporte |
| **Testing** | Automatización de E2E tests (Cypress o Playwright) |
| **Compliance** | Auditoría completa, RLS aislamiento, performance baseline |
| **Cleanup** | Fix bugs descubiertos, optimización de queries |

---

### Sprint 26-28: Migración SUTR → Renalfy

| Sprint | Descripción | Scope |
|---|---|---|
| S26 | **Data Mapping** | Mapeo de entidades SUTR → Renalfy, validación de integridad |
| S27 | **Migration Tools** | Scripts de migración, rollback plan, validaciones post-migración |
| S28 | **Cutover** | Migración de primer cliente, monitoring, support |

**Decisiones previas (ver `/docs/SUTR_RENALFY_ENTITY_MAPPING.md`):**
- Datos clínicos históricos de SUTR se **descartan** (compliance simplificación)
- Pacientes, ubicaciones, productos se **transforman**
- Planes y recibos se **recalculan** en Renalfy

---

## Módulos No Construidos

Los siguientes módulos están en el backlog (no iniciados):

| Módulo | Ubicación | Descripción | Prioridad |
|---|---|---|---|
| **Clinical Templates** | /settings/clinical-templates | CRUD de plantillas dinámicas | Alta (próximo) |
| **Branding / Tenant Settings** | /settings/branding | Configuración de marca (logo, colores, nombre) | Media |
| **Reports / Analytics** | /reports | Exportación de reportes, dashboards | Media |
| **Patient Measurements** | /patients/:id/measurements | Historial de mediciones clínicas | Alta (próximo) |
| **Audit Log Viewer** | /settings/audit | Visor de logs de auditoría (compliance) | Media |

---

## Notas Técnicas por Sprint

### S21 — Lessons Learned: Módulo 4 Backend

**Gotchas:**
1. **Folio generation:** requerirá transacción para garantizar no hay race conditions (implementado con `Prisma.$transaction`)
2. **Stock deduction:** validar **antes** de crear venta (validación en service, antes de transacción)
3. **Plan.usedSessions:** calcular correctamente si beneficiario tiene múltiples planes (se usa el primero activo)
4. **CashClose:** una vez creado (`status=CLOSED`), es inmutable — usar índices para optimizar búsquedas
5. **AuditLog:** async fire-and-forget, así que errores de auditoría no rompen la transacción principal

**Testing:**
- Usar fixtures de BD compartidas en E2E (no limpiar entre tests, usar rollback de transacciones)
- Tests de folio deben ser secuenciales (state-dependent)
- Mocks de PrismaService deben ser tipados con `DeepMockProxy`

---

### S22-23 — Frontend en Progreso

**Patrones confirmados:**
1. Formularios en modales, no en pages (confirmado por feedback)
2. React Hook Form + Zod resolver para validación client
3. Tablas con shadcn/ui DataTable component
4. Detail drawer lateral (no modal fullscreen)

**Próximos pasos:**
- Completar tests de componentes
- Validar RLS en frontend (MANAGER filter)
- Implementar transiciones de estado (FINISHED, SETTLED)
- E2E tests para flujos completos

---

## Roadmap de Versiones

| Versión | Sprint | Descripción | ETA |
|---|---|---|---|
| **v0.1.0** | S1-S11 | MVP: Auth, usuarios, pacientes, citas, recibos | ✅ Completado |
| **v0.2.0** | S12-S14 | Planes de cobertura + UI | ✅ Completado |
| **v0.3.0** | S15-S20 | Inventario (productos, proveedores, compras) | ✅ Completado |
| **v0.4.0** | S21-S23 | Módulo financiero (ventas, ingresos, egresos, caja) | 🔄 En progreso |
| **v0.5.0** | S24-S25 | Reportes, analytics, QA completo | 📅 Planeado |
| **v1.0.0** | S26-S28 | Migración SUTR, producción | 📅 Planeado |

---

## Estado Actual (2026-05-20)

### Backend ✅
- **Módulo 4 completado:** 364 tests en verde, todos los endpoints funcionales
- **Compliance:** RLS, AuditLog, transacciones atómicas implementadas
- **Ready para:** integración frontend

### Frontend 🔄
- **Módulo 4 UI:** ~90% completada
- **Pendiente:** tests finales, RLS validation, transiciones de estado
- **ETA:** ~5 días de trabajo

### QA
- **Unitaria:** ✅ completada (backend)
- **Componentes:** 🔄 en progreso (frontend)
- **E2E:** 📅 S25

---

## Métricas del Proyecto

| Métrica | Valor |
|---|---|
| **Total Tests** | ~950+ |
| **Modules** | 26 (backend) |
| **API Endpoints** | ~80+ |
| **Tablas de BD** | 30+ |
| **Monorepo Workspaces** | 5 (api, web, types, ui, utils) |
| **Sprints Completados** | 21 |
| **Sprint Actual** | 22-23 |
| **Lines of Code (backend)** | ~15k |
| **Lines of Code (frontend)** | ~8k |

---

## Referencias

- **Especificaciones técnicas:** `/docs/specs/`
- **Decisiones arquitectónicas:** `/docs/decisions/`
- **Setup y desarrollo:** `/docs/SETUP.md`
- **Arquitectura:** `/docs/ARCHITECTURE.md`
- **Mapeo SUTR → Renalfy:** `/docs/SUTR_RENALFY_ENTITY_MAPPING.md`
- **Guía de desarrollo:** `/CLAUDE.md`
- **Agentes y skills:** `/AGENTS.md`
