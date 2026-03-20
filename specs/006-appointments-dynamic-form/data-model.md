# Data Model: Citas/Sesiones con Formulario Dinámico

**Feature**: `006-appointments-dynamic-form` | **Phase**: 1 — Design

---

## Entities

### Appointment

| Campo          | Tipo                    | Notas                                              |
|----------------|-------------------------|----------------------------------------------------|
| `id`           | UUID                    | PK                                                 |
| `tenantId`     | UUID                    | Del JWT — RLS enforcement                          |
| `locationId`   | UUID                    | Sucursal donde se realiza la cita                  |
| `patientId`    | UUID                    | Paciente con consentimiento activo requerido       |
| `userId`       | UUID                    | Usuario que crea/atiende la cita                   |
| `serviceTypeId`| UUID?                   | Opcional; determina la plantilla clínica           |
| `receiptId`    | UUID?                   | Enlace al recibo (sprint 7)                        |
| `scheduledAt`  | DateTime                | Fecha y hora programada                            |
| `startedAt`    | DateTime?               | Seteado automáticamente al → IN_PROGRESS           |
| `endedAt`      | DateTime?               | Seteado automáticamente al → COMPLETED             |
| `status`       | AppointmentStatus       | SCHEDULED (default)                                |
| `clinicalData` | JSON?                   | Datos del formulario dinámico al crear la cita     |
| `notes`        | String?                 | Notas libres del clínico                           |
| `createdAt`    | DateTime                | Automático                                         |
| `updatedAt`    | DateTime                | Automático                                         |

**Estado → siguientes estados válidos:**
```
SCHEDULED   → IN_PROGRESS, CANCELLED, NO_SHOW
IN_PROGRESS → COMPLETED, CANCELLED
COMPLETED   → (inmutable — NOM-004)
CANCELLED   → (terminal)
NO_SHOW     → (terminal)
```

**Invariantes:**
- `status = COMPLETED` → inmutable. Ningún campo puede cambiar.
- `patientId` → debe existir en el mismo tenant/location con consentimiento activo.
- `serviceTypeId` → si existe, debe tener `status = ACTIVE`.
- `clinicalData` → si `serviceTypeId` tiene plantilla, se validan campos `required`.

---

### Measurement

| Campo           | Tipo     | Notas                                        |
|-----------------|----------|----------------------------------------------|
| `id`            | UUID     | PK                                           |
| `tenantId`      | UUID     | RLS enforcement                              |
| `appointmentId` | UUID     | FK → Appointment                             |
| `recordedAt`    | DateTime | Momento del registro (puede ser pasado)      |
| `data`          | JSON     | Valores clínicos: `{ "weight": 70, ... }`    |
| `notes`         | String?  | Observaciones libres                         |

**Invariantes:**
- Solo se puede crear cuando `Appointment.status = IN_PROGRESS`.
- **Inmutable** una vez creada (NOM-004) — sin endpoints de update/delete.
- `tenantId` siempre igual al de la cita padre.

---

### ClinicalTemplate

| Campo          | Tipo     | Notas                                              |
|----------------|----------|----------------------------------------------------|
| `id`           | UUID     | PK                                                 |
| `tenantId`     | UUID     | RLS enforcement                                    |
| `serviceTypeId`| UUID     | Único por tenant (upsert)                          |
| `fields`       | JSON     | Array de definiciones de campo (ver estructura)    |
| `updatedAt`    | DateTime | Automático                                         |

**Estructura de `fields`:**
```json
[
  {
    "key": "weight",
    "label": "Peso (kg)",
    "type": "number",
    "required": true
  },
  {
    "key": "status",
    "label": "Estado del paciente",
    "type": "select",
    "options": ["Estable", "Inestable", "Crítico"],
    "required": true
  }
]
```

Tipos de campo: `"text" | "number" | "boolean" | "select"`.

**Invariantes:**
- Un `serviceTypeId` tiene como máximo una plantilla por tenant (upsert).
- Cambiar la plantilla NO afecta citas históricas (su `clinicalData` es inmutable).

---

## Relationships

```
Tenant
  └─ Location
       └─ Appointment (tenantId + locationId)
            ├─ Patient     (patientId)
            ├─ ServiceType (serviceTypeId?)
            ├─ User        (userId)
            └─ Measurement[]

Tenant
  └─ ServiceType
       └─ ClinicalTemplate (1:1 por tenant)
```

---

## Prisma Schema — Sin cambios necesarios

Los modelos `Appointment`, `Measurement`, y `ClinicalTemplate` ya existen en `schema.prisma` con todos los campos requeridos. **No se necesita migración en este sprint.**
