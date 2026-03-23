# SUTR ↔ Renalfy Entity Mapping

**Purpose:** Quick reference for all data transformations during migration

---

## Quick Mapping Reference

| SUTR Table | Renalfy Model(s) | Type | Status |
|---|---|---|---|
| `users` | `User` | 1:1 | Map role enum |
| `unidads` | `Location` | 1:1 | Direct |
| `pacientes` | `Patient` + `PatientConsent` | 1:many | Backfill consent |
| `conceptos` | `ServiceType` | 1:1 | Direct |
| `sesions` | `Appointment` | 1:1 | Extract 48 fields → JSON |
| `signos` | `Measurement` | many:1 | Multiple measurements per session |
| `recibos` | `Receipt` | 1:1 | Generate folio |
| `empresas` | `Company` | 1:1 | Direct |
| `beneficios` | `Plan` | 1:1 | Calculate exhausted status |
| `productos` | `Product` | 1:1 | Handle string stock field |
| `producto_unidads` | `LocationStock` | 1:1 | Direct |
| `proveedors` | `Supplier` | 1:1 | Direct |
| `producto_proveedors` | `SupplierProduct` | 1:1 | Direct |
| `pedidos` | `PurchaseOrder` | 1:1 | Direct |
| `pedido_productos` | `PurchaseOrderItem` | 1:1 | Direct |
| `compras` | `Purchase` | 1:1 | Direct + trigger stock update |
| `producto_compras` | `PurchaseItem` | 1:1 | Direct |
| `registros` | `InventoryMovement` | 1:1 | Infer type from context |
| `producto_registros` | `InventoryMovementItem` | 1:1 | Direct |
| `ventas` | `Sale` | 1:1 | Direct + trigger stock update |
| `producto_ventas` | `SaleItem` | 1:1 | Direct |
| `ingresos` | `Income` | 1:1 | Assign to primary location |
| `egresos` | `Expense` | 1:1 | Assign to primary location |
| `cortes` | `CashClose` | 1:1 | Aggregate totals from linked records |
| `corte_ventas` | (implicit via FK) | link | Use Sale.isClosed + Sale.closedAt |
| `notificacions` | (not migrated) | N/A | Not in v1 Renalfy scope |

---

## Detailed Field Mappings

### 1. Users

```
SUTR users → Renalfy User

┌─ SELECT * FROM users ──────┐
│ id                         → UUID (new)
│ name                       → name
│ email                      → email (unique per tenant)
│ password                   → password (hash required; force reset)
│ tipo (INT 1–4)             → role (enum: SUPER_ADMIN, ADMIN, MANAGER, STAFF)
│   1 → SUPER_ADMIN
│   2 → ADMIN
│   3 → MANAGER
│   4 → STAFF
│ estatus (INT 1–2)          → status (enum: ACTIVE, SUSPENDED)
│   1 → ACTIVE
│   2 → SUSPENDED
│ telefono                   → phone
│ foto                       → avatarUrl (leave NULL; re-upload)
│ unidad_id                  → locationId (NULL if tipo < 3)
│ remember_token            → (drop; not used in Renalfy)
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
└────────────────────────────┘

Role Mapping Logic:
const roleMap: Record<number, UserRole> = {
  1: 'SUPER_ADMIN',
  2: 'ADMIN',
  3: 'MANAGER',
  4: 'STAFF',
};

Status Mapping Logic:
const statusMap: Record<number, UserStatus> = {
  1: 'ACTIVE',
  2: 'SUSPENDED',
};

⚠️ NOTES:
- If no SUPER_ADMIN exists after migration, assign one
- All passwords must be reset; send reset link via email
- Avatar URLs won't carry over; users re-upload
```

---

### 2. Locations (unidades)

```
SUTR unidads → Renalfy Location

┌─ SELECT * FROM unidads ────┐
│ id                         → UUID (new)
│ nombre                     → name
│ direccion                  → address
│ estatus (INT 1–2)          → status (string: 'active' | 'inactive')
│   1 → 'active'
│   2 → 'inactive'
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
│ phone                      → NULL (SUTR doesn't have per-location phone)
└────────────────────────────┘

Status Mapping:
const statusMap: Record<number, string> = {
  1: 'active',
  2: 'inactive',
};

⚠️ NOTES:
- All SUTR units become a single tenant's multiple locations
- First location becomes "primary" for ambiguous data (income, expenses)
```

---

### 3. Patients + Consent

```
SUTR pacientes → Renalfy Patient + PatientConsent

┌─ Patient ──────────────────┐
│ id                         → UUID (new)
│ nombre                     → name
│ direccion                  → address
│ telefono                   → phone
│ celular                    → mobile
│ fecha_nacimiento           → birthDate
│ estatus (INT 1–2)          → status (enum: ACTIVE, INACTIVE, DELETED)
│   1 → ACTIVE
│   2 → INACTIVE
│ unidad_id                  → locationId (map via unidades)
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
│ ssn, insuranceNumber,
│ email, bloodType           → NULL (optional; not in SUTR)
│ hasActiveConsent           → true (set by backfill)
└────────────────────────────┘

┌─ PatientConsent ───────────┐
│ (NEW RECORD)
│ patientId                  → (from Patient.id)
│ tenantId                   → (set to SUTR tenant ID)
│ type                       → 'PRIVACY_NOTICE'
│ version                    → '1.0' (or current)
│ grantedAt                  → MIN(patient's appointments) - 1 day
│                              OR migration_timestamp - 30 days
│ revokedAt                  → NULL
│ ipAddress                  → NULL (backfilled; no source)
│ signatureUrl               → NULL (backfilled; no source)
└────────────────────────────┘

⚠️ NOTES:
- Consent backfill is legal fiction (create clear audit trail)
- grantedAt should be before first clinical record
- If patient has no appointments, use fixed date (e.g., org founding)
- hasActiveConsent flag will be set to true for all migrated patients
```

---

### 4. Service Types (conceptos)

```
SUTR conceptos → Renalfy ServiceType

┌─ SELECT * FROM conceptos ──┐
│ id                         → UUID (new)
│ nombre                     → name
│ estatus (INT 1–2)          → status (enum: ACTIVE, INACTIVE)
│   1 → ACTIVE
│   2 → INACTIVE
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
│ description                → NULL (SUTR has none; enrich manually)
│ price                      → NULL (SUTR has none; optional)
└────────────────────────────┘

⚠️ NOTES:
- SUTR has minimal concept model (just name + status)
- Renalfy ServiceType is richer (description, price)
- Leave optional fields null; can be edited post-migration
- Plan to have at least one: "Hemodiálisis" (create manually or infer)
```

---

### 5. Appointments (sesiones) + Measurements (signos)

```
SUTR sesiones → Renalfy Appointment + ClinicalTemplate

┌─ Appointment (from sesion) ┐
│ id                         → UUID (new)
│ recibo_id                  → receiptId (map via Receipt)
│ paciente_id (implicit)     → patientId (from Receipt.patientId)
│ unidad_id (implicit)       → locationId (from Receipt.locationId)
│ user_id (implicit)         → userId (from Receipt.userId)
│ fecha                      → scheduledAt
│ status                     → 'COMPLETED' (assume all historical sessions complete)
│ created_at, updated_at     → createdAt, updatedAt
│
│ CLINICAL DATA:
│ clinicalData (JSON)        → All 48 fields as flat JSON object:
│   {
│     "peso_seco": 72.5,
│     "ktv": "1.2",
│     "heparina": 5000,
│     "fc_pre": 78,
│     ... (all 48 fields)
│   }
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
│ serviceTypeId              → (set to 'Hemodiálisis' ServiceType)
│ startedAt, endedAt         → NULL (SUTR only has fecha)
│ notes                      → NULL (captured in clinicalData)
└────────────────────────────┘

┌─ ClinicalTemplate (for Hemodialysis) ┐
│ id                         → UUID (new)
│ serviceTypeId              → (Hemodiálisis)
│ tenantId                   → (set to SUTR tenant ID)
│
│ fields (JSON array):
│ [
│   {
│     "key": "peso_seco",
│     "label": "Peso seco",
│     "type": "decimal",
│     "unit": "kg",
│     "required": true,
│     "order": 1
│   },
│   {
│     "key": "ktv",
│     "label": "Kt/V",
│     "type": "string",
│     "required": false,
│     "order": 15
│   },
│   ... (all 48 fields, ordered 1–48)
│ ]
└────────────────────────────┘

┌─ Measurement (from signos) ┐
│ id                         → UUID (new)
│ sesion_id                  → appointmentId (map via sesion)
│ hora                       → recordedAt (sesion.fecha + signos.hora)
│ data (JSON)                → All vital sign fields:
│   {
│     "t_a": "120/80",
│     "fc": 72,
│     "qs": 300,
│     "qd": 500,
│     "p-art": 180,
│     "p-ven": -150,
│     "ptm": 15,
│     "vel_uf": 10,
│     "uf_conseg": 2.5,
│     "soluciones": "...",
│     "observaciones": "..."
│   }
│ created_at, updated_at     → createdAt (signos.created_at), NULL
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
└────────────────────────────┘

⚠️ CRITICAL NOTES:
- 48 dialysis-specific fields MUST be extracted to JSON
- Field order matters (UI will display in order)
- Create ClinicalTemplate once per tenant; reuse for all sesiones
- Multiple signos per sesion → multiple Measurements per Appointment
- Measurement.recordedAt = sesion.fecha + signos.hora combined
- Assume all historical sessions are COMPLETED
```

---

### 6. Receipts (recibos)

```
SUTR recibos → Renalfy Receipt + ReceiptFolioCounter

┌─ Receipt ──────────────────┐
│ id                         → UUID (new)
│ paciente_id                → patientId
│ unidad_id                  → locationId
│ user_id                    → userId
│ tipo_pago (string)         → paymentType (enum mapping below)
│ fecha                      → date
│ cantidad                   → amount (convert to Decimal)
│ estatus (INT 1–2)          → status (enum: ACTIVE, FINISHED, SETTLED, CANCELLED)
│   1 → ACTIVE (or FINISHED if old)
│   2 → CANCELLED
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
│ serviceTypeId              → (set to ServiceType ID if derivable)
│ planId                     → NULL (link later if benefit)
│ folio                      → GENERATE: "{LOC_CODE}-{YYYY}-{NNNNN}"
│   Example: "SUC1-2016-00001"
└────────────────────────────┘

Payment Type Mapping:
const paymentTypeMap: Record<string, PaymentType> = {
  'CASH': 'CASH',
  'CREDIT': 'CREDIT',
  'BENEFIT': 'BENEFIT',
  'INSURANCE': 'INSURANCE',
  'TRANSFER': 'TRANSFER',
  // (map SUTR values)
};

Folio Generation:
1. Extract location code (e.g., 'SUC1' from first unidad)
2. Group receipts by (locationId, year)
3. Generate sequential: lastSequence++ per year
4. Format: `{CODE}-{YYYY}-{SEQUENCE.padStart(5, '0')}`

┌─ ReceiptFolioCounter (per location/year) ┐
│ id                         → UUID (new)
│ tenantId                   → (SUTR tenant ID)
│ locationId                 → (location)
│ year                       → (extracted from fecha year)
│ lastSequence               → (max sequence number for that year)
└────────────────────────────┘

⚠️ NOTES:
- SUTR recibos doesn't have folio field; generate it
- Check SUTR unidades for location code (or generate "LOC1", "LOC2", etc.)
- Payment type values must be confirmed in SUTR codebase
- Assume estatus=1 is ACTIVE (or FINISHED if receipt is old)
- Create ReceiptFolioCounter entries for each location/year present in data
```

---

### 7. Companies (empresas)

```
SUTR empresas → Renalfy Company

┌─ SELECT * FROM empresas ───┐
│ id                         → UUID (new)
│ razon_social               → name
│ rfc                        → taxId
│ telefono                   → phone
│ correo                     → email
│ direccion                  → address
│ persona_contacto           → contactPerson
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
└────────────────────────────┘

⚠️ NOTES:
- Direct mapping; no transforms needed
```

---

### 8. Plans (beneficios)

```
SUTR beneficios → Renalfy Plan

┌─ SELECT * FROM beneficios ─┐
│ id                         → UUID (new)
│ paciente_id                → patientId
│ empresa_id                 → companyId
│ concepto_id                → serviceTypeId
│ user_id                    → userId
│ unidad_id                  → locationId
│ fecha                      → startDate
│ sesiones                   → plannedSessions
│ sesiones_realizadas        → usedSessions
│ cantidad                   → amount
│ estatus (INT 1–2)          → status (enum: ACTIVE, INACTIVE, EXHAUSTED)
│   1 → ACTIVE (or EXHAUSTED if used >= planned)
│   2 → INACTIVE
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
│ notes                      → NULL
└────────────────────────────┘

Status Logic:
if (sesiones_realizadas >= sesiones && estatus === 1) {
  status = 'EXHAUSTED';
} else if (estatus === 1) {
  status = 'ACTIVE';
} else {
  status = 'INACTIVE';
}

⚠️ NOTES:
- Check sesiones_realizadas against sesiones to determine EXHAUSTED
- Renalfy Plan doesn't have end date (implicit: ongoing)
```

---

### 9. Products (productos)

```
SUTR productos → Renalfy Product

┌─ SELECT * FROM productos ──┐
│ id                         → UUID (new)
│ nombre                     → name
│ marca                      → brand
│ precio                     → purchasePrice (convert double → Decimal)
│ precio_venta               → salePrice (convert double → Decimal)
│ categoria                  → category
│ presentacion               → (description or drop)
│ cantidad_paquete           → packageQty
│ stock (STRING!)            → (handle carefully; see notes)
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
│ status                     → 'ACTIVE' (assume unless marked deleted)
│ description                → presentacion (if useful) or NULL
└────────────────────────────┘

Stock Field Handling:
The SUTR `stock` field is a STRING (design issue).
Possible values:
  - Empty or NULL → 0
  - Numeric string "100" → 100
  - Non-numeric "ABC" → 0 (log warning)

const parseStock = (stock: string | null): number => {
  if (!stock) return 0;
  const parsed = parseInt(stock, 10);
  return isNaN(parsed) ? 0 : parsed;
};

⚠️ NOTES:
- Product.stock is global; LocationStock.quantity is per location
- SUTR stock field is ambiguous; leave as-is in Product (or drop)
- Actual stock lives in producto_unidads (maps to LocationStock)
```

---

### 10. Location Stock (producto_unidades)

```
SUTR producto_unidads → Renalfy LocationStock

┌─ SELECT * FROM producto_unidads ───┐
│ id                         → UUID (new)
│ unidad_id                  → locationId (map via unidades)
│ producto_id                → productId (map via productos)
│ cantidad                   → quantity
│ stock_minimo               → minStock
│ cantidad_paquete           → packageQty
│ stock_corte                → alertLevel
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
└────────────────────────────┘

⚠️ NOTES:
- producto_unidads is 1:1 with LocationStock
- Unique constraint: (locationId, productId)
```

---

### 11. Suppliers (proveedors)

```
SUTR proveedors → Renalfy Supplier

┌─ SELECT * FROM proveedors ─┐
│ id                         → UUID (new)
│ nombre                     → name
│ iniciales                  → initials
│ contacto                   → contact
│ telefono                   → phone
│ correo                     → email
│ estatus (INT 1–2)          → status (enum: ACTIVE, INACTIVE)
│   1 → ACTIVE
│   2 → INACTIVE
│ created_at, updated_at     → createdAt, updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
└────────────────────────────┘

⚠️ NOTES:
- Direct mapping
```

---

### 12. Supplier Product (producto_proveedors)

```
SUTR producto_proveedors → Renalfy SupplierProduct

┌─ SELECT * FROM producto_proveedors ┐
│ id                         → UUID (new)
│ producto_id                → productId
│ proveedor_id               → supplierId
│ precio                     → price (convert double → Decimal)
│ updated_at                 → updatedAt
│
│ NEW FIELDS:
│ tenantId                   → (set to SUTR tenant ID)
└────────────────────────────┘

⚠️ NOTES:
- Many-to-many relationship: Product ↔ Supplier
- Unique constraint: (productId, supplierId)
```

---

### 13–18. Purchase Orders, Items, Purchases, Items

```
SUTR pedidos → Renalfy PurchaseOrder
SUTR pedido_productos → Renalfy PurchaseOrderItem
SUTR compras → Renalfy Purchase
SUTR producto_compras → Renalfy PurchaseItem

┌─ PurchaseOrder ─────────────┐
│ id                          → UUID
│ user_id                     → userId
│ unidad_id                   → locationId
│ fecha                       → date
│ estatus (INT 1–2)           → status (enum: DRAFT, ISSUED, RECEIVED, CANCELLED)
│   1 → DRAFT (or ISSUED if has compra linked)
│   2 → CANCELLED
│ observaciones               → notes
│ created_at, updated_at      → createdAt, updatedAt
│ tenantId (new)              → SUTR tenant ID
└─────────────────────────────┘

┌─ PurchaseOrderItem ─────────┐
│ id                          → UUID
│ pedido_id                   → purchaseOrderId
│ producto_id                 → productId
│ cantidad                    → quantity
│ tenantId (new)              → SUTR tenant ID (for RLS)
└─────────────────────────────┘

┌─ Purchase ──────────────────┐
│ id                          → UUID
│ user_id                     → userId
│ proveedor_id                → supplierId
│ fecha                       → date
│ importe                     → amount (convert double → Decimal)
│ observaciones               → notes
│ created_at                  → createdAt
│ tenantId (new)              → SUTR tenant ID
│
│ ⚠️ ON CREATE TRIGGER:
│ For each PurchaseItem:
│   LocationStock.quantity += quantity
│   (determine locationId from context; may need additional mapping)
└─────────────────────────────┘

┌─ PurchaseItem ──────────────┐
│ id                          → UUID
│ compra_id                   → purchaseId
│ producto_id                 → productId
│ cantidad                    → quantity
│ precio                      → price (convert double → Decimal)
│ tax                         → tax (if present in SUTR)
│ package_qty                 → packageQty (if present)
│ tenantId (new)              → SUTR tenant ID
└─────────────────────────────┘

⚠️ CRITICAL NOTES:
- Verify SUTR schema for Purchase: does it link to Location? If not, infer.
- Stock update logic: When Purchase created, increment LocationStock for each item
- PurchaseOrder.estatus: need to check if SUTR links orders to purchases
```

---

### 19–20. Inventory Movements

```
SUTR registros → Renalfy InventoryMovement
SUTR producto_registros → Renalfy InventoryMovementItem

┌─ InventoryMovement ─────────┐
│ id                          → UUID
│ user_id                     → userId
│ unidad_id                   → locationId
│ fecha                       → date
│ (no type field in SUTR!)    → type (enum: IN, OUT)
│ observaciones               → notes
│ created_at                  → createdAt
│ tenantId (new)              → SUTR tenant ID
│
│ Type Inference:
│ If positive quantity → IN
│ If negative quantity → OUT
│ (or check SUTR code for intent)
└─────────────────────────────┘

┌─ InventoryMovementItem ─────┐
│ id                          → UUID
│ registro_id                 → inventoryMovementId
│ producto_id                 → productId
│ cantidad                    → quantity
│ tenantId (new)              → SUTR tenant ID
│
│ ⚠️ ON CREATE TRIGGER:
│ LocationStock.quantity += quantity (if type=IN)
│ LocationStock.quantity -= quantity (if type=OUT)
└─────────────────────────────┘

⚠️ NOTES:
- SUTR registros has no explicit type field
- Infer from quantity sign or lookup in code
```

---

### 21–22. Sales

```
SUTR ventas → Renalfy Sale
SUTR producto_ventas → Renalfy SaleItem

┌─ Sale ──────────────────────┐
│ id                          → UUID
│ user_id                     → userId
│ fecha                       → date
│ pago (INT)                  → paymentMethod (enum mapping)
│ cliente                     → customer
│ importe                     → amount (convert double → Decimal)
│ estatus (INT 1–2)           → status (enum: PENDING, SETTLED, CANCELLED)
│ fecha_liquidacion           → settledAt
│ corte (BOOLEAN)             → isClosed
│ fecha_corte                 → closedAt
│ observaciones               → notes
│ created_at, updated_at      → createdAt, updatedAt
│ tenantId (new)              → SUTR tenant ID
│ locationId (new)            → (infer from context or unidad_id if available)
│ cashCloseId (new)           → (link to CashClose if corte=true)
└─────────────────────────────┘

Payment Method Mapping:
const paymentMethodMap: Record<number, PaymentMethod> = {
  1: 'CASH',
  2: 'CREDIT',
  3: 'TRANSFER',
  4: 'OTHER',
  // (verify SUTR values)
};

Status Mapping:
if (fecha_liquidacion is not null/0000-00-00) {
  status = 'SETTLED';
} else if (estatus === 2) {
  status = 'CANCELLED';
} else {
  status = 'PENDING';
}

┌─ SaleItem ──────────────────┐
│ id                          → UUID
│ venta_id                    → saleId
│ producto_id                 → productId
│ cantidad                    → quantity
│ precio                      → price (convert double → Decimal)
│ tenantId (new)              → SUTR tenant ID
│
│ ⚠️ ON CREATE TRIGGER:
│ LocationStock.quantity -= quantity
│ (reduce stock for sale)
└─────────────────────────────┘

⚠️ CRITICAL NOTES:
- pago field must be confirmed in SUTR code (payment method enum)
- fecha_liquidacion of 0000-00-00 → NULL → status = PENDING
- corte boolean links to CashClose (also check corte_ventas table)
- Stock update: decrement for each SaleItem
- locationId may need inference if not in SUTR data
```

---

### 23–24. Income & Expenses

```
SUTR ingresos → Renalfy Income
SUTR egresos → Renalfy Expense

┌─ Income ────────────────────┐
│ id                          → UUID
│ user_id                     → userId
│ concepto                    → concept
│ fecha                       → date
│ importe                     → amount (convert double → Decimal)
│ corte (BOOLEAN)             → isClosed
│ fecha_corte                 → closedAt (0000-00-00 → NULL)
│ observaciones               → notes
│ created_at                  → createdAt
│ tenantId (new)              → SUTR tenant ID
│ locationId (new)            → PRIMARY LOCATION (SUTR doesn't track)
│ cashCloseId (new)           → (link if corte=true)
└─────────────────────────────┘

┌─ Expense ───────────────────┐
│ (same as Income)
└─────────────────────────────┘

Location Assignment:
// All income/expenses assigned to primary location
incomeLocationId = (await Location.findFirst({
  where: { tenantId },
  orderBy: { createdAt: 'asc' }
})).id

⚠️ NOTES:
- SUTR has no locationId on income/expenses
- Assign all to primary location as interim solution
- Post-migration: can reassign manually if multi-location needed
- fecha_corte of 0000-00-00 → NULL
- isClosed mirrors corte boolean
```

---

### 25. Cash Close (cortes)

```
SUTR cortes → Renalfy CashClose

┌─ CashClose ─────────────────┐
│ id                          → UUID
│ user_id                     → userId
│ unidad_id                   → locationId
│ fecha_corte                 → closedAt
│ fecha_inicio                → periodStart
│ fecha_fin                   → periodEnd
│ observaciones               → notes
│ created_at                  → createdAt
│ tenantId (new)              → SUTR tenant ID
│
│ CALCULATED FIELDS:
│ cashTotal                   → SUM(Sale.amount WHERE paymentMethod=CASH
│                                  AND isClosed=true AND closedAt=corte.closedAt)
│ creditTotal                 → SUM(Sale.amount WHERE paymentMethod=CREDIT
│                                  AND isClosed=true AND closedAt=corte.closedAt)
│ incomeTotal                 → SUM(Income.amount WHERE isClosed=true
│                                  AND closedAt=corte.closedAt)
│ expenseTotal                → SUM(Expense.amount WHERE isClosed=true
│                                  AND closedAt=corte.closedAt)
│ netTotal                    → cashTotal + creditTotal + incomeTotal - expenseTotal
│
│ ORIGINAL SUTR FIELD:
│ importe (SUTR)              → (drop or verify against netTotal)
│
│ LINKING:
│ Link all Sales, Incomes, Expenses with this closedAt to this CashClose:
│   Sale.cashCloseId = CashClose.id
│   Income.cashCloseId = CashClose.id
│   Expense.cashCloseId = CashClose.id
└─────────────────────────────┘

Aggregation Query:
const clos = await CashClose.create({
  tenantId,
  locationId,
  userId,
  closedAt,
  periodStart,
  periodEnd,
  cashTotal: await aggregateCash(locationId, closedAt),
  creditTotal: await aggregateCredit(locationId, closedAt),
  incomeTotal: await aggregateIncome(locationId, closedAt),
  expenseTotal: await aggregateExpense(locationId, closedAt),
  // netTotal calculated in DB/service
});

⚠️ NOTES:
- SUTR cortes.importe is ambiguous (verify its meaning)
- Renalfy requires calculated totals from linked records
- This is a critical reconciliation point; validate carefully
- Link Sales/Income/Expenses before or after CashClose creation (transaction)
```

---

## Enum/Status Value Mappings

### UserRole
```
SUTR tipo → Renalfy UserRole

1 → SUPER_ADMIN
2 → ADMIN
3 → MANAGER
4 → STAFF
```

### UserStatus
```
SUTR estatus → Renalfy UserStatus

1 → ACTIVE
2 → SUSPENDED
```

### PaymentType (Receipts)
```
SUTR tipo_pago → Renalfy PaymentType

'CASH'      → CASH
'CREDIT'    → CREDIT
'BENEFIT'   → BENEFIT
'INSURANCE' → INSURANCE
'TRANSFER'  → TRANSFER

⚠️ VERIFY IN SUTR CODE: what are actual values?
```

### PaymentMethod (Sales)
```
SUTR pago → Renalfy PaymentMethod

1 → CASH
2 → CREDIT
3 → TRANSFER
4 → OTHER

⚠️ VERIFY IN SUTR CODE: exact mapping needed
```

### ReceiptStatus
```
SUTR estatus (recibos) → Renalfy ReceiptStatus

1 → ACTIVE (or FINISHED if old)
2 → CANCELLED
```

### PlanStatus
```
SUTR estatus (beneficios) + logic → Renalfy PlanStatus

1 + sesiones_realizadas < sesiones → ACTIVE
1 + sesiones_realizadas >= sesiones → EXHAUSTED
2 → INACTIVE
```

### LocationStatus
```
SUTR estatus (unidads) → Renalfy Location.status

1 → 'active'
2 → 'inactive'
```

---

## Critical Transformations

### Transformation 1: Session Fields → JSON

All 48 dialysis fields from `sesions` table must be extracted into `Appointment.clinicalData` JSON.

**Source fields:**
- `t_a_pie`, `fc_pre`, `peso_seco`, `peso_pre`, `peso_post`, `peso_grando`, `uf_programada`, `filtro`, `reuso_n`, `heparina`, `qs`, `qd`, `vsp`, `na_b`, `no_maquina`, `na_presc`, `perfil_na`, `perfil_uf`, `bolo`, `ui_hr`, `ktv`, `acc_vasc`, `t_apost`, `fc_post`, `conecto`, `desconecto`, `total`, `medicamentos`, `alergias`, `observaciones`

**Target:**
```json
{
  "peso_seco": 72.5,
  "ktv": "1.2",
  "heparina": 5000,
  "fc_pre": 78,
  // ... all 48 fields as a flat object
}
```

### Transformation 2: Vital Signs → Measurements

Multiple `signos` rows per session → Multiple `Measurement` rows per appointment.

**Source:** `signos.sesion_id` (group by sesion)
**Target:** `Measurement.appointmentId` (one per signos row)

### Transformation 3: Folio Generation

Generate sequential receipt numbers with format: `{LOCATION_CODE}-{YYYY}-{NNNNN}`

**Process:**
1. Group SUTR receipts by (unidad_id, year)
2. Sort by fecha
3. Assign sequence: 1, 2, 3, ...
4. Format: `SUC1-2016-00001`, `SUC1-2016-00002`, etc.

### Transformation 4: Status to DateTime

Convert SUTR date field `0000-00-00` (NULL sentinel) → NULL DateTime

```typescript
const parseDate = (date: string): Date | null => {
  if (!date || date === '0000-00-00') return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
};
```

### Transformation 5: Double → Decimal

Convert all monetary fields from `double` to `Decimal(10, 2)`

```typescript
import Decimal from 'decimal.js';

const toDecimal = (value: number): Decimal => {
  return new Decimal(value).toDecimalPlaces(2);
};
```

---

## Validation Checklist

Before finalizing migration, validate:

- [ ] All foreign key references resolve (no orphaned records)
- [ ] All required fields populated (no unexpected NULLs)
- [ ] Decimal precision OK (no values with > 2 decimals)
- [ ] Dates parsed correctly (no 0000-00-00 remaining)
- [ ] Role enums valid (1–4 mapped to SUPER_ADMIN/ADMIN/MANAGER/STAFF)
- [ ] Status enums valid (1–2 mapped correctly)
- [ ] Patient consent created for all patients
- [ ] Receipt folios sequential per location/year
- [ ] ClinicalTemplate created for Hemodialysis service type
- [ ] Audit log entries captured (optional but recommended)
- [ ] Row counts match pre/post migration (within tolerance)
- [ ] Cash close totals reconcile with linked records
- [ ] Stock quantities consistent (purchases + movements + sales)
- [ ] User passwords reset (all users forced to reset on first login)

---

**Generated:** 2026-03-22
**Status:** Ready for migration script implementation
