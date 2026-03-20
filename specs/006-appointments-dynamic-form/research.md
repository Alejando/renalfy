# Research: Citas/Sesiones con Formulario Dinámico

**Feature**: `006-appointments-dynamic-form` | **Phase**: 0 — Research

---

## Decision 1: Estructura del campo `fields` en `ClinicalTemplate`

**Decision**: Array JSON de objetos con `key`, `label`, `type`, y `required`.

```json
[
  { "key": "weight",        "label": "Peso (kg)",         "type": "number",  "required": true  },
  { "key": "bloodPressure", "label": "Tensión arterial",  "type": "text",    "required": true  },
  { "key": "duration",      "label": "Duración (min)",    "type": "number",  "required": false },
  { "key": "notes",         "label": "Observaciones",     "type": "text",    "required": false }
]
```

Tipos soportados: `"text" | "number" | "boolean" | "select"`. Para `select`, se agrega `options: string[]`.

**Rationale**: Estructura mínima para implementar validación de campos requeridos y renderizado de formulario dinámico en el frontend (sprint posterior). Es extensible sin migración de esquema (todo es JSON).

**Alternatives considered**:
- JSON Schema completo (draft-07): demasiado complejo para el sprint, introduce dependencias externas.
- Tabla relacional `TemplateField`: más rígido, requiere migración por cada nuevo tipo de campo.

---

## Decision 2: Validación de `clinicalData` contra la plantilla

**Decision**: Validación en el servicio (no en el DTO). El DTO solo valida que `clinicalData` sea `Record<string, unknown>`. El servicio, al recibir `serviceTypeId`, busca la plantilla y verifica que todos los campos `required: true` estén presentes en `clinicalData`.

**Rationale**: La estructura de los campos es dinámica (varía por tipo de servicio y tenant) y no puede expresarse en un schema Zod estático. El servicio tiene acceso a la BD para obtener la plantilla en el momento de la validación.

**Alternatives considered**:
- Validación en el controller con un pipe custom: requiere acceso a BD desde el pipe, rompe separación de responsabilidades.
- Sin validación (solo almacenar como JSON libre): viola FR-008, deja datos inconsistentes.

---

## Decision 3: Inmutabilidad de citas COMPLETED y mediciones (NOM-004)

**Decision**: Enforced en el servicio (no en BD). El servicio verifica `status === 'COMPLETED'` antes de cualquier update y lanza `ConflictException`. Las mediciones no tienen endpoints de update/delete — solo CREATE y READ.

**Rationale**: El modelo de datos de Prisma no tiene triggers, y la RLS no cubre reglas de negocio de este tipo. El servicio es la capa correcta.

**Alternatives considered**:
- Triggers PostgreSQL: más seguro pero más difícil de testear y de mantener.
- Sin enforcing (confiar en el frontend): viola NOM-004.

---

## Decision 4: Transiciones de estado válidas

**Decision**: Mapa de transiciones definido como constante en el servicio:

```typescript
const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED:   ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
};
```

`startedAt = now()` al entrar a `IN_PROGRESS`. `endedAt = now()` al entrar a `COMPLETED`.

**Rationale**: Explícito, testeable, fácil de extender. El mapa es la documentación viva de las transiciones permitidas.

**Alternatives considered**:
- State machine library (XState): overhead innecesario para 5 estados.

---

## Decision 5: `ClinicalTemplate` — upsert por `serviceTypeId`

**Decision**: `POST /api/clinical-templates` hace upsert: si ya existe una plantilla para ese `serviceTypeId` en el tenant, la actualiza; si no, la crea. El endpoint es idempotente.

**Rationale**: El schema de Prisma ya tiene `@@unique([tenantId, serviceTypeId])` implícito via `serviceTypeId @unique` (limitado a un tenant gracias a RLS). Upsert evita que el OWNER tenga que distinguir si ya existe una plantilla.

**Alternatives considered**:
- POST para crear + PATCH para actualizar: más REST-puro pero añade complejidad al frontend (necesita saber si existe primero).

---

## Decision 6: Scope de `GET /api/appointments/:id`

**Decision**: Retorna la cita con todas sus mediciones (`measurements`) incluidas en la respuesta. No se pagina; una cita rara vez tiene más de 10-20 mediciones en una sesión.

**Rationale**: El caso de uso principal es ver el expediente completo de una sesión. Incluir mediciones en el mismo response evita un segundo request.

**Alternatives considered**:
- Endpoint separado `GET /api/appointments/:id/measurements`: más RESTful pero añade round-trip al cliente.
