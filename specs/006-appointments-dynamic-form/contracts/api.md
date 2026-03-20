# API Contracts: Citas/Sesiones con Formulario Dinámico

**Feature**: `006-appointments-dynamic-form` | **Prefix**: `/api`

---

## Appointments

### `POST /api/appointments`

**Roles**: OWNER, ADMIN, MANAGER, STAFF

**Request**:
```json
{
  "patientId": "uuid",
  "locationId": "uuid",
  "serviceTypeId": "uuid",
  "scheduledAt": "2026-03-25T10:00:00.000Z",
  "clinicalData": {
    "weight": 68.5,
    "bloodPressure": "120/80"
  },
  "notes": "Primera sesión del mes"
}
```

**Response `201`**:
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "locationId": "uuid",
  "patientId": "uuid",
  "userId": "uuid",
  "serviceTypeId": "uuid",
  "scheduledAt": "2026-03-25T10:00:00.000Z",
  "startedAt": null,
  "endedAt": null,
  "status": "SCHEDULED",
  "clinicalData": { "weight": 68.5, "bloodPressure": "120/80" },
  "notes": "Primera sesión del mes",
  "measurements": [],
  "createdAt": "2026-03-25T09:55:00.000Z",
  "updatedAt": "2026-03-25T09:55:00.000Z"
}
```

**Errores**:
- `400` — payload inválido o `clinicalData` no cumple la plantilla
- `403` — paciente sin consentimiento activo, o MANAGER en otra sucursal
- `404` — `patientId` o `serviceTypeId` no encontrado en el tenant/location

---

### `GET /api/appointments`

**Roles**: Todos los autenticados

**Query params**: `?page=1&limit=20&date=2026-03-25&status=SCHEDULED&patientId=uuid`

**Response `200`**:
```json
{
  "data": [ ...Appointment[] ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

---

### `GET /api/appointments/:id`

**Roles**: Todos los autenticados

**Response `200`**: Appointment completo con `measurements` incluidos.

```json
{
  "id": "uuid",
  "status": "IN_PROGRESS",
  "clinicalData": { "weight": 68.5 },
  "measurements": [
    {
      "id": "uuid",
      "recordedAt": "2026-03-25T10:30:00.000Z",
      "data": { "bloodPressure": "118/76" },
      "notes": null
    }
  ],
  "...": "resto de campos del appointment"
}
```

**Errores**: `404` — no existe o no pertenece al tenant/location del usuario.

---

### `PATCH /api/appointments/:id/status`

**Roles**: OWNER, ADMIN, MANAGER, STAFF

**Request**:
```json
{
  "status": "IN_PROGRESS",
  "notes": "Paciente llegó puntual"
}
```

**Response `200`**: Appointment actualizado con el nuevo estado.

**Errores**:
- `400` — transición de estado inválida
- `404` — cita no encontrada en el scope del usuario
- `409` — cita con `status = COMPLETED` (inmutable)

---

### `POST /api/appointments/:id/measurements`

**Roles**: OWNER, ADMIN, MANAGER, STAFF

**Request**:
```json
{
  "recordedAt": "2026-03-25T10:30:00.000Z",
  "data": {
    "bloodPressure": "118/76",
    "weight": 68.2
  },
  "notes": "Medición a mitad de sesión"
}
```

**Response `201`**:
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "appointmentId": "uuid",
  "recordedAt": "2026-03-25T10:30:00.000Z",
  "data": { "bloodPressure": "118/76", "weight": 68.2 },
  "notes": "Medición a mitad de sesión"
}
```

**Errores**:
- `404` — cita no encontrada
- `409` — cita no está en estado `IN_PROGRESS`

---

## Clinical Templates

### `POST /api/clinical-templates`

**Roles**: OWNER, ADMIN
**Semántica**: Upsert — crea si no existe, actualiza si ya hay plantilla para ese `serviceTypeId`.

**Request**:
```json
{
  "serviceTypeId": "uuid",
  "fields": [
    { "key": "weight",        "label": "Peso (kg)",        "type": "number",  "required": true  },
    { "key": "bloodPressure", "label": "Tensión arterial", "type": "text",    "required": true  },
    { "key": "notes",         "label": "Observaciones",    "type": "text",    "required": false }
  ]
}
```

**Response `200` o `201`**:
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "serviceTypeId": "uuid",
  "fields": [ ... ],
  "updatedAt": "2026-03-25T09:00:00.000Z"
}
```

**Errores**:
- `400` — `serviceTypeId` inválido o estructura de `fields` incorrecta
- `403` — rol insuficiente (STAFF/MANAGER)
- `404` — `serviceTypeId` no existe en el tenant

---

### `GET /api/clinical-templates`

**Roles**: Todos los autenticados

**Query params**: `?serviceTypeId=uuid`

**Response `200`**: Array de plantillas del tenant.

---

### `GET /api/clinical-templates/:id`

**Roles**: Todos los autenticados

**Response `200`**: Plantilla completa.

**Errores**: `404` — no encontrada.
