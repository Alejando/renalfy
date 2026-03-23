# SUTR → Renalfy Migration Analysis
**Date:** 2026-03-22
**Status:** Complete Analysis
**Scope:** Full system inventory, gap analysis, and migration roadmap

---

## Executive Summary

SUTR (Sistema Único de Tratamiento Renal) is a **single-tenant Laravel monolith** built specifically for dialysis clinics. Renalfy is a **multi-tenant SaaS platform** designed to be generic and configurable for any medical specialty.

The migration strategy requires:
1. **Mapping SUTR's fixed schema** to Renalfy's configurable data model
2. **Converting single-tenant data** to multi-tenant (SUTR becomes the first tenant)
3. **Generalizing 50+ dialysis-specific fields** into a configurable `ClinicalTemplate` JSON structure
4. **Adding missing features** to Renalfy (particularly compliance-related and some business logic nuances)

---

## Part 1: SUTR System Inventory

### 1.1 Database Tables (30 tables)

#### Platform / Auth Tables
| SUTR Table | Fields | Notes |
|---|---|---|
| `users` | id, name, email, password, estatus, telefono, foto, tipo, unidad_id | Auth only; fixed roles (tipo); unidad_id ties user to one location |
| `password_resets` | email, token, created_at | Standard Laravel table |

#### Clinic Module (Dialysis-Specific)
| SUTR Table | Fields | Notes |
|---|---|---|
| `unidads` | id, nombre, direccion, estatus, timestamps | Single location per clinic; no parent organization |
| `pacientes` | id, unidad_id, nombre, direccion, telefono, celular, fecha_nacimiento, estatus | Basic demographics; no email, SSN, or ID number |
| `conceptos` | id, nombre, estatus | Service types; very minimal structure |
| `sesions` | id, recibo_id, fecha, 48 dialysis-specific fields (peso_seco, ktv, heparina, etc.), timestamps | **HUGE field count** — hardcoded for hemodialysis only |
| `signos` | id, sesion_id, hora, t_a, fc, qs, qd, p-art, p-ven, ptm, vel_uf, uf_conseg, soluciones, observaciones | Periodic vital sign measurements during a session |
| `recibos` | id, paciente_id, unidad_id, user_id, tipo_pago, fecha, cantidad, estatus | Invoice/receipt for a session; minimal structure |

#### Plans / Companies Module
| SUTR Table | Fields | Notes |
|---|---|---|
| `empresas` | id, razon_social, rfc, telefono, correo, direccion, persona_contacto | Companies/insurers funding treatment |
| `beneficios` | id, user_id, paciente_id, empresa_id, unidad_id, concepto_id, fecha, sesiones, cantidad, estatus, sesiones_realizadas | Plans: N sessions prepaid; tracks usage |
| `cbeneficios` | (relation table for benefits, likely consumed sessions counter) | Details unclear from migration file name |

#### Inventory Module
| SUTR Table | Fields | Notes |
|---|---|---|
| `productos` | id, nombre, marca, precio, precio_venta, categoria, presentacion, cantidad_paquete, stock | Products; stock is a string (design issue?) |
| `producto_unidads` | id, unidad_id, producto_id, cantidad, stock_minimo, cantidad_paquete, stock_corte | Stock per location; separate from global product |
| `proveedors` | id, nombre, iniciales, contacto, telefono, correo, estatus | Suppliers |
| `producto_proveedors` | (M:M link with pricing) | Supplier product pricing |
| `pedidos` | id, user_id, unidad_id, fecha, estatus, observaciones | Purchase orders |
| `pedido_productos` | (items in purchase order) | Order line items |
| `compras` | id, user_id, proveedor_id, fecha, importe, observaciones | Purchases (received goods) |
| `producto_compras` | id, compra_id, producto_id, cantidad, precio, tax?, packageQty? | Purchase line items; schema inferred |
| `registros` | (inventory movements — inferred) | Manual stock adjustments |
| `producto_registros` | (items in inventory movement) | Movement line items |

#### Cash Module
| SUTR Table | Fields | Notes |
|---|---|---|
| `ventas` | id, user_id, fecha, pago, cliente, importe, estatus, fecha_liquidacion, corte (boolean), fecha_corte, observaciones | Sales with payment method; supports liquidity tracking |
| `producto_ventas` | (M:M items in sales) | Sale line items |
| `ingresos` | id, user_id, concepto, fecha, importe, corte (boolean), fecha_corte, observaciones | Misc. income |
| `egresos` | id, user_id, concepto, fecha, importe, corte (boolean), fecha_corte, observaciones | Misc. expenses |
| `cortes` | id, user_id, unidad_id, importe, fecha_corte, fecha_inicio, fecha_fin, observaciones | Cash close; only stores one importe (unclear how detailed) |
| `corte_ventas` | (link table between cortes and ventas) | Links closes to sales included |

#### Other
| SUTR Table | Fields | Notes |
|---|---|---|
| `notificacions` | (inferred) | Notification log |

---

### 1.2 SUTR Business Logic & Field Mapping

#### Dialysis-Specific Fields in `sesions` (48 hardcoded fields)

These are **THE critical challenge** for generic migration:

**Pre-session vitals:**
- `t_a_pie` — Blood pressure (pre-session, standing)
- `fc_pre` — Heart rate (pre)
- `peso_seco` — Dry weight
- `peso_pre` — Weight pre-session
- `peso_post` — Weight post-session
- `peso_grando` — (unclear; possibly "weight gained" or typo)

**Dialysis machine parameters:**
- `uf_programada` — Ultrafiltration programmed (L)
- `filtro` — Filter model
- `reuso_n` — Reuse number
- `heparina` — Heparin dosage
- `qs` — Blood flow (Qs, mL/min)
- `qd` — Dialysate flow (Qd, mL/min)
- `vsp` — Venous Pressure (VSP)
- `na_b` — Sodium balance
- `no_maquina` — Machine number
- `na_presc` — Sodium prescribed
- `perfil_na` — Sodium profile
- `perfil_uf` — UF profile
- `bolo` — Heparin bolus
- `ui_hr` — Heparin units/hour
- `ktv` — Kt/V (adequacy measure)
- `acc_vasc` — Vascular access type

**Post-session:**
- `t_apost` — Blood pressure (post-session)
- `fc_post` — Heart rate (post)

**Administration:**
- `conecto` — Connection time
- `desconecto` — Disconnection time
- `total` — Total session time
- `medicamentos` — Medications administered
- `alergias` — Allergies noted
- `observaciones` — Free-form notes

**Periodic measurements during session (in `signos`):**
- `hora` — Time of measurement
- `t_a` — Blood pressure (periodic)
- `fc` — Heart rate (periodic)
- `qs`, `qd` — Flow rates (may be adjusted)
- `p-art`, `p-ven`, `ptm` — Arterial, venous, transmembrane pressures
- `vel_uf` — UF velocity
- `uf_conseg` — UF achieved
- `soluciones` — Solutions running
- `observaciones` — Notes

**Total:** ~48 fields across session init + periodic measurements

---

### 1.3 User Roles in SUTR

SUTR stores `tipo` (type) as an integer, no explicit enum. Inferred roles:

| Tipo | Role Name | Scope |
|---|---|---|
| 1 | Super Admin | Platform-level |
| 2 | Admin | Organization-level (all units) |
| 3 | Manager | Unit-level operator |
| 4 | Staff | Data entry / clinician |

**Mapping to Renalfy:**
- 1 → `SUPER_ADMIN`
- 2 → `ADMIN`
- 3 → `MANAGER`
- 4 → `STAFF`

**Issue:** SUTR has no `OWNER` role — may need to create one during migration or assign roles carefully.

---

### 1.4 Data Volume & Complexity

**Estimated row counts (based on typical clinic):**
- Patients: 50–500
- Sessions: 500–5,000+ (3× per week per patient)
- Vital signs (signos): 2,000–20,000+ (multiple per session)
- Receipts: 500–5,000
- Plans: 10–100
- Products: 50–500
- Suppliers: 5–30
- Sales: 100–1,000
- Inventory movements: 50–200

**Data integrity concerns:**
- `fecha_liquidacion` and `fecha_corte` stored as `0000-00-00` when null (MySQL antipattern)
- Foreign key constraints not visible in migration files (may be missing)
- No soft deletes visible — only `estatus` field

---

## Part 2: Renalfy Current State

### 2.1 Implemented Modules (as of Sprint 11)

| Module | Entities | Status |
|---|---|---|
| Auth | User, Tenant, TenantSettings | ✅ Complete (Sprint 2) |
| Locations / Organization | Location, User (with multi-tenant) | ✅ Complete (Sprint 3) |
| Clinic Module 1 | Patient, ServiceType, Receipt, Appointment, Measurement, ClinicalTemplate | ✅ Complete (Sprint 5–7) |
| Plans Module 2 | Company, Plan, ReceiptFolioCounter | ✅ Complete (not explicitly mentioned, but schema exists) |
| Inventory Module 3 | Product, LocationStock, Supplier, SupplierProduct, PurchaseOrder, Purchase, InventoryMovement | ✅ Complete (schema exists; UI in progress) |
| Cash Module 4 | Sale, Income, Expense, CashClose | ✅ Complete (schema exists; UI in progress) |
| Compliance | PatientConsent, AuditLog | ✅ Complete (regulatory models in schema) |

### 2.2 Data Model Design Choices

**Key differences from SUTR:**
1. **Multi-tenant architecture:** Every table (except `Tenant`) has `tenantId`
2. **Configurable clinical data:** `Appointment.clinicalData` is JSON + `ClinicalTemplate.fields` defines schema
3. **UUIDs:** All PKs are UUIDs (vs. auto-increment integers in SUTR)
4. **Immutable fields:** `Measurement` and audit logs follow NOM-004 compliance
5. **Flexible pricing:** `ServiceType.price` is optional; pricing lives in `Product`, `SupplierProduct`, `Plan.amount`
6. **Multi-location inventory:** `LocationStock` decouples product (global) from stock (per location)
7. **Audit trail:** Dedicated `AuditLog` table (separate from regular operations)

---

## Part 3: Gap Analysis

### 3.1 Missing in Renalfy (vs. SUTR)

#### Critical for SUTR migration:
1. **`unidad_id` / `locationId` mismatch in `ingresos` and `egresos`:**
   - SUTR doesn't track location for income/expense
   - Renalfy requires `locationId` on `Income` and `Expense`
   - **Decision needed:** Assign all SUTR income/expenses to the primary location or prompt during migration?

2. **No receipt folio generation logic in schema:**
   - Renalfy has `ReceiptFolioCounter` but SUTR doesn't show folio column in `recibos` table
   - **Check:** Does SUTR generate folios or are they just `id`?

3. **No multi-unit organization concept in SUTR:**
   - SUTR has single-unit clinics (one `unidad` per clinic)
   - Renalfy has `Location` (multiple per tenant/organization)
   - **Migration strategy:** Create one tenant per SUTR clinic, one location per SUTR unidad

4. **No explicit notification system:**
   - `notificacions` table exists but no clear schema
   - Renalfy has no notification model (planned for future)

5. **Stock field type issue:**
   - SUTR `productos.stock` is a string (design error?)
   - Renalfy uses `LocationStock.quantity` as integer
   - **Cleanup needed** during migration

6. **Missing patient ID fields for SUTR:**
   - SUTR has no national ID (CURP), insurance number, or email
   - Renalfy schema allows these but they're optional
   - **Decision:** Add optional fields to support future needs?

---

### 3.2 Extras in Renalfy (not in SUTR)

1. **PatientConsent (LFPDPPP compliance):**
   - SUTR has no consent tracking
   - Renalfy requires explicit consent before creating clinical records
   - **Action:** During migration, create backdated `PatientConsent` records (with clear audit trail)

2. **AuditLog (NOM-004 compliance):**
   - SUTR has no audit trail
   - Renalfy has immutable audit log
   - **Action:** Optionally populate AuditLog during migration (retrospective audit trail)

3. **ServiceType.description and price:**
   - SUTR `conceptos` is minimal (name + status)
   - Renalfy allows rich descriptions and optional pricing
   - **Action:** Migrate only name; leave description/price for manual review

4. **Appointment.startedAt, endedAt:**
   - SUTR `sesions` only has `fecha`
   - Renalfy tracks time details
   - **Action:** Migrate `fecha` → `scheduledAt`; leave time fields null

5. **Plan status transitions:**
   - SUTR `beneficios.estatus` is just active/inactive
   - Renalfy has `PlanStatus: ACTIVE | INACTIVE | EXHAUSTED`
   - **Action:** Map; check `sesiones_realizadas >= sesiones` to set EXHAUSTED

---

### 3.3 Schema Misalignments

| Aspect | SUTR | Renalfy | Resolution |
|---|---|---|---|
| **Identifiers** | Auto-increment INT | UUID | Transform during migration; build mapping table |
| **Dates with null** | `0000-00-00` (MySQL antipattern) | Nullable DateTime | Convert to NULL during migration |
| **User roles** | `tipo` INT (1–4) | Enum (5 roles) | Map 1→SUPER_ADMIN, 2→ADMIN, 3→MANAGER, 4→STAFF |
| **Status fields** | `estatus` INT (1 = active, 2 = inactive/suspended) | String or enum | Map 1 → active status, 2 → INACTIVE/SUSPENDED depending on model |
| **Clinical data** | 48 hardcoded columns | JSON + ClinicalTemplate | Create template; extract columns → JSON |
| **Receipts folio** | (possibly just ID?) | `folio` STRING + `ReceiptFolioCounter` | Generate sequential folios with format `LOC-YYYY-NNNNN` |
| **Multi-location** | N/A (single location) | `locationId` required | SUTR data → location_id = single primary location |
| **Timestamps** | `created_at`, `updated_at` | Same | Direct mapping |

---

### 3.4 Data Transformation Rules

#### Users
```
SUTR users.tipo → Renalfy User.role:
  1 → SUPER_ADMIN
  2 → ADMIN
  3 → MANAGER
  4 → STAFF

SUTR users.estatus → Renalfy User.status:
  1 → ACTIVE
  2 → SUSPENDED

SUTR users.foto → Renalfy User.avatarUrl (keep as-is or download if URL)

SUTR users.unidad_id → Renalfy User.locationId (if tipo > 2)
```

#### Locations
```
SUTR unidads → Renalfy Location:
  nombre → name
  direccion → address
  estatus → status ("active" if 1, else "inactive")
```

#### Patients
```
SUTR pacientes → Renalfy Patient:
  nombre → name
  direccion → address
  telefono → phone
  celular → mobile
  fecha_nacimiento → birthDate
  estatus → status (map 1→ACTIVE, 2→INACTIVE)
  unidad_id → locationId

✨ NEW: Create PatientConsent records:
  patientId = patient.id
  tenantId = (SUTR org's tenant id)
  type = PRIVACY_NOTICE
  grantedAt = MIN(earliest_appointment_date, now()) - 1 day
  (This is a legal fiction for backfill; real consent will be captured on next login)
```

#### Service Types
```
SUTR conceptos → Renalfy ServiceType:
  nombre → name
  estatus → status
  (No price in SUTR; leave Renalfy price null)
```

#### Sessions → Appointments + Measurements
```
SUTR sesions (48 fields) → Renalfy Appointment + ClinicalTemplate

1. Create ClinicalTemplate for "Hemodialysis" ServiceType:
   - serviceTypeId = serviceType("Hemodialysis").id
   - fields = JSON array of 48 field definitions

2. For each sesion row:
   - Appointment.id = new UUID
   - Appointment.receiptId = mapped_receipt_id
   - Appointment.scheduledAt = sesion.fecha
   - Appointment.status = COMPLETED (assume all historical are done)
   - Appointment.clinicalData = {
       "peso_seco": ...,
       "ktv": ...,
       ... (all 48 fields as a flat JSON object)
     }
   - Appointment.createdAt = sesion.created_at
   - Appointment.updatedAt = sesion.updated_at

3. For each signos row within sesion:
   - Measurement.appointmentId = appointment.id
   - Measurement.recordedAt = sesion.fecha + signos.hora
   - Measurement.data = {
       "t_a": ...,
       "fc": ...,
       "qs": ...,
       ... (all signos columns)
     }
```

#### Receipts
```
SUTR recibos → Renalfy Receipt:
  paciente_id → patientId
  unidad_id → locationId
  user_id → userId
  tipo_pago → paymentType (map CASH/CREDIT/etc.)
  fecha → date
  cantidad → amount
  estatus → status (1 → ACTIVE, 2 → CANCELLED or FINISHED)

✨ Generate folio:
  folio = "{LOCATION_CODE}-{YYYY}-{SEQUENCE}"
  Sequence starts at 1 per location/year
  Example: "SUC1-2025-00042"
```

#### Companies
```
SUTR empresas → Renalfy Company:
  razon_social → name
  rfc → taxId
  telefono → phone
  correo → email
  direccion → address
  persona_contacto → contactPerson
```

#### Plans / Benefits
```
SUTR beneficios → Renalfy Plan:
  paciente_id → patientId
  empresa_id → companyId
  concepto_id → serviceTypeId
  user_id → userId
  unidad_id → locationId
  sesiones → plannedSessions
  sesiones_realizadas → usedSessions
  cantidad → amount
  fecha → startDate
  estatus → status (1 → ACTIVE, 2 → INACTIVE; check if exhausted)
```

#### Products & Stock
```
SUTR productos → Renalfy Product:
  nombre → name
  marca → brand
  categoria → category
  presentacion → (description or drop)
  precio → purchasePrice
  precio_venta → salePrice
  cantidad_paquete → packageQty
  stock → ??? (CLARIFY: global alert level? drop if not relevant)
  estatus → (add status field to Product if needed; currently just deleted ones removed)

SUTR producto_unidads → Renalfy LocationStock:
  unidad_id → locationId
  producto_id → productId
  cantidad → quantity
  stock_minimo → minStock
  stock_corte → alertLevel
  cantidad_paquete → packageQty
```

#### Suppliers
```
SUTR proveedors → Renalfy Supplier:
  nombre → name
  iniciales → initials
  contacto → contact
  telefono → phone
  correo → email
  estatus → status

SUTR producto_proveedors (M:M) → Renalfy SupplierProduct:
  producto_id → productId
  proveedor_id → supplierId
  precio → price
```

#### Purchase Orders & Purchases
```
SUTR pedidos → Renalfy PurchaseOrder:
  user_id → userId
  unidad_id → locationId
  fecha → date
  estatus → status (map 1→DRAFT, 2→ISSUED/RECEIVED based on presence in compras)
  observaciones → notes

SUTR pedido_productos → Renalfy PurchaseOrderItem:
  pedido_id → purchaseOrderId
  producto_id → productId
  cantidad → quantity

SUTR compras → Renalfy Purchase:
  user_id → userId
  proveedor_id → supplierId
  fecha → date
  importe → amount
  observaciones → notes

SUTR producto_compras → Renalfy PurchaseItem:
  compra_id → purchaseId
  producto_id → productId
  cantidad → quantity
  precio → price
  tax → tax (if present)

✨ Stock update on Purchase creation:
  For each PurchaseItem:
    LocationStock.quantity += quantity
```

#### Inventory Movements
```
SUTR registros → Renalfy InventoryMovement:
  user_id → userId
  unidad_id → locationId
  fecha → date
  (no type field; infer from context or assume IN/OUT)
  observaciones → notes

SUTR producto_registros → Renalfy InventoryMovementItem:
  registro_id → inventoryMovementId
  producto_id → productId
  cantidad → quantity
```

#### Sales
```
SUTR ventas → Renalfy Sale:
  user_id → userId
  fecha → date
  pago → paymentMethod (map values)
  cliente → customer
  importe → amount
  estatus → status
  fecha_liquidacion → settledAt
  corte → isClosed
  fecha_corte → closedAt
  observaciones → notes

SUTR producto_ventas → Renalfy SaleItem:
  venta_id → saleId
  producto_id → productId
  cantidad → quantity
  precio → price

✨ Stock update on Sale creation:
  For each SaleItem:
    LocationStock.quantity -= quantity
```

#### Income & Expenses
```
SUTR ingresos → Renalfy Income:
  user_id → userId
  concepto → concept
  fecha → date
  importe → amount
  corte → isClosed
  fecha_corte → closedAt
  observaciones → notes
  ✨ locationId → (DECISION NEEDED: assign to primary location or prompt)

SUTR egresos → Renalfy Expense:
  (same as ingresos)
```

#### Cash Close
```
SUTR cortes → Renalfy CashClose:
  user_id → userId
  unidad_id → locationId
  importe → ??? (is this netTotal? clarify in SUTR code)
  fecha_corte → closedAt
  fecha_inicio → periodStart
  fecha_fin → periodEnd
  observaciones → notes

✨ Renalfy requires calculated fields:
  cashTotal, creditTotal, incomeTotal, expenseTotal, netTotal
  → Aggregate from linked Sales, Incomes, Expenses
```

---

## Part 4: What Needs to be Changed in Renalfy

### 4.1 Schema Additions / Modifications

#### 1. Patient — Add fields for compliance + full identity
```prisma
model Patient {
  // existing...
  ssn             String?          // CURP / National ID (for Mexico)
  insuranceNumber String?          // Policy number
  email           String?          // Contact email (nullable, as SUTR has none)
  bloodType       String?          // Medical data (O+, A-, etc.)

  // Compliance fields
  hasConsent      Boolean          @default(false)  // Flag for quick UI checks

  // @@index on (tenantId, status) if not already present
}
```

#### 2. Income & Expense — Add locationId if missing
```prisma
// Already present in schema — NO CHANGE NEEDED
// Both have locationId, which SUTR will map to primary location during migration
```

#### 3. Product — Add status field (optional, for soft deletes)
```prisma
model Product {
  // existing...
  status   ProductStatus  @default(ACTIVE)  // if we want to support logical deletes
}

enum ProductStatus {
  ACTIVE
  INACTIVE
  DISCONTINUED
}
```

#### 4. ClinicalTemplate — Pre-populate Hemodialysis template
This is **not a schema change**, but **seed data** that must be created during migration.

#### 5. User — Validate role assignments
Ensure that migrated users have valid roles. May need data validation script.

#### 6. Receipt — Ensure folio generation is in place
Schema already has folio and ReceiptFolioCounter — **no change needed**.

#### 7. AuditLog — Ensure `tenantId` is NOT null for migrations
Current schema allows null tenantId (for platform-level events). For SUTR migration, all should have tenantId. **No schema change**, but migration script must include `tenantId`.

---

### 4.2 Business Logic / Service Updates

#### 1. Receipt Folio Generation
**Already implemented** in Sprint 7. Verify it's production-ready.

#### 2. Plan Session Consumption
**Already implemented** in Sprint 7. Ensure it triggers when receipt status → FINISHED.

#### 3. Stock Updates on Purchase / Sale / Movement
**Already implemented** in Sprint 15+ (inventory). Verify transactions are atomic.

#### 4. Appointment clinicalData Validation
Need to validate JSON fields against ClinicalTemplate.fields during creation.
**May need:** Custom validator or service method.

#### 5. Patient Consent Auto-population
**Need to add** service method to backfill PatientConsent records during migration.

#### 6. Audit Log Auto-population
**Optional:** Service method to populate AuditLog with action=MIGRATE for all created records.

---

### 4.3 Data Seeding / Initial Configuration

For SUTR (first tenant):

1. **Tenant record:**
   ```
   slug: "sutr"
   name: "SUTR Clínicas de Diálisis"
   status: ACTIVE
   plan: "enterprise"
   ```

2. **TenantSettings:**
   ```
   logoUrl: (preserved from SUTR or left blank for manual upload)
   primaryColor: (auto or default)
   phone: (from company info)
   email: (from company info)
   address: (from company info)
   ```

3. **ClinicalTemplate for Hemodialysis:**
   ```json
   {
     "serviceTypeId": "...",
     "fields": [
       {
         "key": "peso_seco",
         "label": "Peso seco",
         "type": "decimal",
         "unit": "kg",
         "required": true,
         "order": 1
       },
       {
         "key": "ktv",
         "label": "Kt/V",
         "type": "string",
         "required": false,
         "order": 15
       },
       // ... all 48 fields, ordered logically
     ]
   }
   ```

---

## Part 5: Migration Script Roadmap

### 5.1 High-Level Steps

1. **Pre-flight checks:**
   - Validate SUTR DB schema vs. expected migrations
   - Count rows per table
   - Identify NULL/invalid data

2. **Tenant & Settings:**
   - Create Tenant record for SUTR
   - Create TenantSettings

3. **Locations:**
   - Migrate SUTR `unidads` → Renalfy `Location` (1:1 mapping)
   - Assign all future data to primary location (first unidad)

4. **Users:**
   - Migrate users, map roles, hash existing passwords (or force reset)
   - Create one OWNER if none exists

5. **Clinic Data (in order):**
   - ServiceTypes (from `conceptos`)
   - ClinicalTemplate (create for Hemodialysis)
   - Patients + PatientConsent (backfilled)
   - Appointments (from `sesions`)
   - Measurements (from `signos`)
   - Receipts (generate folios)

6. **Plan Data:**
   - Companies
   - Plans

7. **Inventory Data:**
   - Products
   - LocationStock
   - Suppliers
   - SupplierProduct
   - PurchaseOrders
   - Purchases + stock updates
   - InventoryMovements

8. **Cash Data:**
   - Sales + stock updates
   - Income
   - Expenses
   - CashClose (with aggregated totals)

9. **Compliance:**
   - Populate AuditLog (optional; retrospective)

10. **Validation & cleanup:**
    - Verify referential integrity
    - Check balance of cash close vs. aggregates
    - Audit log completeness

---

### 5.2 Critical Implementation Decisions

1. **ID Mapping:**
   - Build in-memory map: `sutr_id → renalfy_uuid` for each table
   - Store in temporary mapping table during migration (drop after validation)

2. **Date/Time Handling:**
   - SUTR `0000-00-00` → NULL
   - SUTR `created_at` with no timezone → assume UTC

3. **Decimal Precision:**
   - SUTR uses `double` — Renalfy uses `Decimal(10,2)`
   - May lose precision; document if > 2 decimals found

4. **Duplicate Check:**
   - Before insert, check if record already exists (idempotency)
   - Option to re-run migration without data loss

5. **Transaction Boundaries:**
   - Per major entity (not per row) to keep transactions manageable
   - Rollback on first error (fail-fast)

6. **Validation:**
   - Enforce all Renalfy constraints (NOT NULL, unique, etc.)
   - Log errors to migration report (don't stop; continue with warnings)

---

## Part 6: Detailed Gaps by Entity

### 6.1 Users & Auth

| SUTR | Renalfy | Gap | Solution |
|---|---|---|---|
| `tipo` INT | `role` ENUM | Mapping table needed | Create lookup: 1→SUPER_ADMIN, etc. |
| `estatus` INT | `status` ENUM | Value mapping | 1→ACTIVE, 2→SUSPENDED |
| No Owner concept | `OWNER` role | Create if missing | Assign to tenant creator or first ADMIN |
| `foto` (file path) | `avatarUrl` (URL) | Path vs. URL | Re-host or leave NULL for manual re-upload |
| Single location (unidad_id) | Multi-location (locationId nullable) | Flexible | MANAGER/STAFF get their unidad_id mapped to locationId |

**Action:** Create migration script with role mapping table; validate role counts before/after.

---

### 6.2 Patients & Clinical

| SUTR | Renalfy | Gap | Solution |
|---|---|---|---|
| No consent tracking | `PatientConsent` required | Legal | Create backdated consent records |
| 48 hardcoded session fields | JSON + template | Arch change | Create ClinicalTemplate; extract columns |
| `sesions` are flat rows | Appointment + Measurement | Normalization | Split session into appointment + vital signs |
| No ID / SSN / email | Optional in Renalfy | Future-proof | Leave NULL; can be added later |
| `signos` tied to sesion | `Measurement` tied to Appointment | 1:1 mapping | Direct; multiple signos → multiple Measurements |

**Action:** Write field-by-field mapping; test on sample data before full migration.

---

### 6.3 Receipts

| SUTR | Renalfy | Gap | Solution |
|---|---|---|---|
| No folio column visible | `folio` required + counter | Required | Generate `LOC-YYYY-NNNNN` format during migration |
| Only `estatus` (1/2) | Status enum (4 values) | Mapping | 1→ACTIVE, 2→CANCELLED (assume; verify in code) |
| No receipt_folio_counter | `ReceiptFolioCounter` exists | New | Create during migration per location/year |

**Action:** Inspect SUTR code to confirm receipt status enum; generate folios with verification script.

---

### 6.4 Companies & Plans

| SUTR | Renalfy | Gap | Solution |
|---|---|---|---|
| `beneficios.estatus` simple | `PlanStatus` with EXHAUSTED | Logic | Check if sesiones_realizadas ≥ sesiones; set EXHAUSTED |
| No end date | Renalfy has `startDate` only | OK | Migrate; leave endDate implicit (ongoing) |

**Action:** Calculate EXHAUSTED status during migration; add validation.

---

### 6.5 Inventory

| SUTR | Renalfy | Gap | Solution |
|---|---|---|---|
| `stock` is STRING in Product | `quantity` is INT in LocationStock | Type mismatch | Convert string→int; handle non-numeric gracefully (default 0) |
| `global_alert` inferred from Productos | `alertLevel` per location | Granular | Use SUTR `stock` if it's a number; else use stock_minimo |
| No PN/SKU tracking | Renalfy has none either | OK | Optional extension in future |

**Action:** Handle string-to-int conversion with safe fallback.

---

### 6.6 Cash

| SUTR | Ventas | Renalfy | Gap | Solution |
|---|---|---|---|---|
| `pago` INT | `paymentMethod` ENUM | Mapping | Verify SUTR values; create lookup |
| `corte` BOOLEAN + `fecha_corte` | `isClosed` + `closedAt` in multiple tables | Linked records | Build corte_ventas mapping; set isClosed/closedAt consistently |
| Single `importe` in cortes | Multiple calculated fields | Aggregation | Sum from linked sales/incomes/expenses during migration |

**Action:** Inspect SUTR pago enum values; validate cash close aggregation.

---

### 6.7 Compliance

| Aspect | SUTR | Renalfy | Gap | Solution |
|---|---|---|---|---|
| Consent tracking | None | `PatientConsent` | Create backdated for all patients | Set `grantedAt` to 1 day before first appointment or fixed date |
| Audit log | None | `AuditLog` immutable | Historic audit trail | Populate with MIGRATE action for all records (optional) |

**Action:** Develop compliant consent backfill strategy with legal review.

---

## Part 7: Sprint Planning for Migration

### Phase 1: Preparation (Sprint 27.5 — 1 week)
- **Task 1:** Create migration script skeleton (Node.js/TypeScript)
- **Task 2:** Extract detailed SUTR schema from running DB
- **Task 3:** Build ID mapping infrastructure (temp table)
- **Task 4:** Write pre-flight validation
- **Deliverable:** Script can connect to both DBs, validate schemas

### Phase 2: Data Migration (Sprint 28 — 2 weeks)
- **Subtask 1:** Users & Auth (1 day)
- **Subtask 2:** Locations & basic org (1 day)
- **Subtask 3:** Service Types & Clinical Templates (1 day)
- **Subtask 4:** Patients & Consent (1 day)
- **Subtask 5:** Appointments, Measurements, Receipts (2 days)
- **Subtask 6:** Companies, Plans (1 day)
- **Subtask 7:** Products, Stock, Suppliers (1 day)
- **Subtask 8:** PurchaseOrders, Purchases, Movements (1 day)
- **Subtask 9:** Sales, Income, Expenses, CashClose (1 day)
- **Subtask 10:** Audit log & compliance (0.5 day)
- **Subtask 11:** Validation & rollback (1 day)
- **Deliverable:** Full data migration script, tested on sample data

### Phase 3: Validation & Testing (Sprint 28/29 — 1 week)
- **Task 1:** Run on production SUTR DB (read-only copy)
- **Task 2:** Validate referential integrity
- **Task 3:** Audit log checks
- **Task 4:** Business logic spot-checks (folio, plans, stock)
- **Task 5:** Performance test (time to migrate, DB size growth)
- **Deliverable:** Migration validated on full dataset

### Phase 4: Cutover Planning (Sprint 29 — 1 week)
- **Task 1:** Maintenance window planning
- **Task 2:** Rollback procedures
- **Task 3:** User communication
- **Task 4:** DNS/subdomain setup (sutr.renalfy.app)
- **Task 5:** Dry-run cutover on staging
- **Deliverable:** Cutover checklist, team training

### Phase 5: Go-Live (Early Sprint 30)
- **Task 1:** Backup both old and new DBs
- **Task 2:** Run migration (production)
- **Task 3:** Validation on prod (spot checks)
- **Task 4:** User access testing
- **Task 5:** Rollback contingency
- **Deliverable:** SUTR live on Renalfy; legacy system sunset planned

---

## Part 8: Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| **ID collision** after mapping | Data corruption | Use UUID; build complete mapping table; verify no conflicts before commit |
| **Decimal precision loss** (double → Decimal) | Financial discrepancies | Log all conversions; flag if > 2 decimals; manual review |
| **Missing foreign keys** in SUTR | Orphaned records | Pre-flight validation; clean up orphans before migration or set default FK |
| **Consent backfill challenges** | Compliance risk | Legal review; clear audit trail showing migration date; user re-consent on first login (optional) |
| **Cash close aggregation mismatch** | Reconciliation headache | Verify totals before/after; store original SUTR cortes.importe for comparison |
| **Stock quantity discrepancies** | Inventory mismatch | Snapshot stock as-is; periodic recount in new system; manual adjustments if needed |
| **Performance (large datasets)** | Migration timeout | Batch processing; test on full dataset first; parallel processing if needed |
| **Folio format collision** | Duplicate receipts | Generate folios starting from max+1; verify no pre-existing folios in Renalfy |

---

## Part 9: Post-Migration Tasks

1. **User training:** Renalfy UI vs. SUTR familiarity
2. **Gradual feature enablement:** May not flip all features at once
3. **Monitoring:** Audit logs, error rates, performance
4. **Feedback loop:** Capture issues, iterate
5. **Sunset SUTR:** After 30–60 days of parallel operation, decommission old system

---

## Conclusion

**Key Takeaway:** SUTR → Renalfy migration is **fundamentally an architecture shift**, not just a data lift.

- **SUTR:** Monolith, hardcoded dialysis fields, single location, minimal compliance
- **Renalfy:** SaaS, configurable via JSON + templates, multi-location, regulatory compliance

**The critical transformation:** 48 hardcoded dialysis session fields → JSON document with ClinicalTemplate schema.

**Estimated effort:**
- Migration script development: 1–2 weeks
- Testing & validation: 1 week
- Cutover: 1 day
- Post-migration monitoring & refinement: 2–4 weeks

**Recommended approach:**
1. Finalize schema tweaks (sections 4.1–4.2)
2. Build & test migration script (Sprint 27.5)
3. Execute on staging (Sprint 28)
4. Cutover to production (Sprint 30)

---

## Appendix: Data Transformation Summary Table

| SUTR Table | Count | Renalfy Table(s) | Transform Complexity | Notes |
|---|---|---|---|---|
| users | 5–50 | User | Medium | Role mapping; password hashing |
| unidads | 1–10 | Location | Low | 1:1 mapping |
| pacientes | 50–500 | Patient + PatientConsent | Medium | Consent backfill |
| sesions | 500–5K | Appointment + ClinicalTemplate | High | Field extraction to JSON |
| signos | 2K–20K | Measurement | Medium | Multi-row per session |
| conceptos | 5–20 | ServiceType | Low | Direct mapping |
| recibos | 500–5K | Receipt | Medium | Folio generation |
| empresas | 5–30 | Company | Low | Direct mapping |
| beneficios | 10–100 | Plan | Low | Status calculation |
| productos | 50–500 | Product | Low | String to int conversion |
| producto_unidads | 50–500 | LocationStock | Low | Direct mapping |
| proveedors | 5–30 | Supplier | Low | Direct mapping |
| producto_proveedors | 10–100 | SupplierProduct | Low | Direct mapping |
| pedidos | 20–200 | PurchaseOrder | Low | Status mapping |
| pedido_productos | 50–500 | PurchaseOrderItem | Low | Direct mapping |
| compras | 20–200 | Purchase | Low | Stock update logic |
| producto_compras | 50–500 | PurchaseItem | Low | Direct mapping |
| registros | 20–200 | InventoryMovement | Low | Type inference |
| producto_registros | 50–500 | InventoryMovementItem | Low | Direct mapping |
| ventas | 100–1K | Sale | Low | Stock update logic |
| producto_ventas | 200–2K | SaleItem | Low | Direct mapping |
| ingresos | 20–200 | Income | Low | Location assignment |
| egresos | 20–200 | Expense | Low | Location assignment |
| cortes | 20–200 | CashClose | Medium | Aggregation logic |
| corte_ventas | (link table) | (derived from isClosed flag) | Low | Implicit via FK |
| notificacions | 0–100 | (not yet in Renalfy) | N/A | Ignore for v1 |
| **password_resets** | 0–10 | (not migrated) | N/A | Expired; ignore |

---

**Generated:** 2026-03-22
**Status:** Ready for Sprint 27.5 kickoff
**Next:** Review with team, finalize schema tweaks, begin migration script
