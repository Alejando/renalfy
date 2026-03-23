# SUTR → Renalfy Migration: Immediate Action Items

**Status:** Ready for Sprint 27–30 execution
**Date:** 2026-03-22

---

## Phase 0: Pre-Migration Decisions (This Week)

### Decision 1: Patient Consent Backfill Strategy

**Question:** How should we handle LFPDPPP compliance for historical patients who don't have explicit consent?

**Options:**
A. Create backdated `PatientConsent` records dated 1 day before their first appointment
B. Require users to re-consent on first login (breaks workflow; not recommended)
C. Create consent records dated as "migrated data" with clear audit trail

**Recommendation:** Option A (Option C as explicit notation)
- Set `grantedAt = MIN(patient_appointments.scheduledAt) - 1 day`
- Add `notes` field to PatientConsent (optional) to indicate "Migrated from SUTR"
- Audit log will show clear timestamp of migration
- Users can see consent exists; doesn't block operations

**Action:** Clarify with legal/compliance team; implement chosen strategy in migration script.

---

### Decision 2: Income & Expense Location Assignment

**Question:** SUTR doesn't track location for `ingresos` and `egresos`, but Renalfy requires `locationId`.

**Options:**
A. Assign all to primary location (locationId = first location from `unidads`)
B. Assign to location of user who created it (if user has locationId)
C. Prompt during migration to resolve ambiguous cases

**Recommendation:** Option A (simplest)
- Create Income/Expense records all with `locationId = primary_location.id`
- If SUTR has multiple units, log which ones lack explicit location
- Can reassign manually post-migration if needed

**Action:** Implement in migration script; log all assignments.

---

### Decision 3: Receipt Folio Format

**Question:** What format should SUTR receipts use for `folio` column?

**Options:**
A. `SUC1-2016-00001` (SUTR naming, if we know location code)
B. `SUTR-2016-00001` (generic tenant code)
C. `{TENANT_CODE}-{LOCATION_CODE}-{YYYY}-{NNNNN}` (full specificity)

**Recommendation:** Option B or derived from SUTR data
- Check if SUTR locations have a CODE field
- If yes, use `{CODE}-{YYYY}-{NNNNN}`
- If no, default to `SUTR-{YYYY}-{NNNNN}` or sequential per location

**Action:** Inspect SUTR unidades table for location codes; confirm with business.

---

### Decision 4: ClinicalTemplate Hemodialysis Fields - Complete List

**Question:** Do we have the definitive list of 48 fields, or need to extract from running DB?

**Current source:** `sesions` table schema from migrations (lines 17–49)

**Fields identified:** ~48 fields across session init + periodic measurements

**Action:**
- Extract exact field names from SUTR schema
- Map to Renalfy field definitions with types, units, required flags
- Create fixture/seed file for ClinicalTemplate
- Example structure in schema section below

---

### Decision 5: Decimal Precision for Money Fields

**Question:** SUTR uses `double` for currency; Renalfy uses `Decimal(10,2)`. Risk of loss?

**Analysis:**
- `double` can represent cents precisely up to ~15 significant digits
- `Decimal(10,2)` caps at 99,999,999.99
- SUTR clinics unlikely to have amounts > this
- Risk: If any amount has > 2 decimals, we lose precision

**Recommendation:**
- Convert all amounts to `Decimal(10,2)` in migration
- Log any values with > 2 decimals found (should be zero)
- If any found, flag for manual review

**Action:** Add validation in migration script; report before committing.

---

## Phase 0.5: Schema Finalization (This Week)

### Schema Tweak 1: Patient — Add compliance & identity fields

**Current Prisma:**
```prisma
model Patient {
  id         String        @id @default(uuid())
  tenantId   String
  locationId String
  name       String
  address    String?
  phone      String?
  mobile     String?
  birthDate  DateTime?
  notes      String?
  status     PatientStatus @default(ACTIVE)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
}
```

**Proposed additions:**
```prisma
model Patient {
  // ... existing fields ...

  // Identity fields (optional for future compliance)
  ssn             String?          // CURP (Mexico) or equivalent
  insuranceNumber String?          // Policy number
  email           String?          // Primary contact email
  bloodType       String?          // Medical history

  // Quick compliance flag (denormalized for perf)
  hasActiveConsent Boolean          @default(false)  // Set by PatientConsent trigger/job

  // Relationships
  consents PatientConsent[]

  // Indexes
  @@index([tenantId, status])
  @@index([tenantId, hasActiveConsent])
}
```

**Rationale:**
- Optional fields allow SUTR migration without data (null is OK)
- `hasActiveConsent` flag speeds up checks like "can create appointment?"
- CURP / insurance number enable future compliance features

**Action:**
- Update schema.prisma
- Create migration: `npx prisma migrate dev --name add_patient_identity_and_consent_flag`
- No data loss (all new fields nullable)

---

### Schema Tweak 2: Product — Add status for soft deletes

**Current Prisma:**
```prisma
model Product {
  id            String   @id @default(uuid())
  tenantId      String
  name          String
  brand         String?
  category      String?
  description   String?
  purchasePrice Decimal  @db.Decimal(10, 2)
  salePrice     Decimal  @db.Decimal(10, 2)
  packageQty    Int      @default(1)
  globalAlert   Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Proposed addition:**
```prisma
model Product {
  // ... existing ...
  status       ProductStatus @default(ACTIVE)

  // Index for filtering active products
  @@index([tenantId, status])
}

enum ProductStatus {
  ACTIVE
  INACTIVE
  DISCONTINUED
}
```

**Rationale:**
- SUTR may have soft-deleted products (status field in many tables)
- Migrated `estatus = 2` can map to INACTIVE
- Allows UI to hide discontinued products without deleting history

**Action:**
- Update schema
- Migrate: `npx prisma migrate dev --name add_product_status`

---

### Schema Tweak 3: ServiceType — Ensure description & optional price

**Current Prisma (looks good):**
```prisma
model ServiceType {
  id          String            @id @default(uuid())
  tenantId    String
  name        String
  description String?           // ✓ Already present
  price       Decimal?          @db.Decimal(10, 2)  // ✓ Already optional
  status      ServiceTypeStatus @default(ACTIVE)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}
```

**Action:** NO CHANGE NEEDED — schema already supports migration.

---

### Schema Tweak 4: ClinicalTemplate — Document field schema

**Current Prisma:**
```prisma
model ClinicalTemplate {
  id            String   @id @default(uuid())
  tenantId      String
  serviceTypeId String   @unique
  fields        Json     // ← Define the structure!
  updatedAt     DateTime @updatedAt
}
```

**Proposed documentation comment:**
```prisma
model ClinicalTemplate {
  id            String   @id @default(uuid())
  tenantId      String
  serviceTypeId String   @unique

  /// JSON array of field definitions.
  /// Structure: [
  ///   {
  ///     "key": "peso_seco",           // Unique field ID
  ///     "label": "Peso seco",         // Display label
  ///     "type": "decimal",            // "string" | "integer" | "decimal" | "date" | "boolean"
  ///     "unit": "kg",                 // Optional (e.g., "kg", "mmHg", "L")
  ///     "required": true,             // Is it mandatory in the form?
  ///     "order": 1,                   // Display order (1–48)
  ///     "minValue": 0,                // Optional (for numeric validation)
  ///     "maxValue": 200,              // Optional
  ///     "pattern": "^[A-Z0-9]+$",     // Optional regex
  ///     "description": "Patient's dry weight in kg"  // Optional help text
  ///   },
  ///   ...
  /// ]
  fields        Json
  updatedAt     DateTime @updatedAt
}
```

**Action:**
- Add JSDoc comment to schema
- Create TypeScript type in `@repo/types` for ClinicalTemplate.fields validation

---

### Schema Tweak 5: ReceiptFolioCounter — Ensure exists

**Current Prisma (looks good):**
```prisma
model ReceiptFolioCounter {
  id           String @id @default(uuid())
  tenantId     String
  locationId   String
  year         Int
  lastSequence Int    @default(0)

  @@unique([tenantId, locationId, year])
}
```

**Action:** NO CHANGE NEEDED.

---

### Summary of Schema Changes

| Model | Change | Reason | Effort |
|---|---|---|---|
| Patient | +4 optional identity fields, +1 flag, +indexes | Compliance, migration support | Low |
| Product | +status enum, +index | Soft deletes, migration support | Low |
| ServiceType | None | Already sufficient | — |
| ClinicalTemplate | Document fields structure | Clarity, type safety | Low |
| ReceiptFolioCounter | None | Already correct | — |

**Total effort:** < 1 day (write migration + test)

---

## Phase 1: Prep Work (Week of Sprint 27)

### Prep Task 1: Extract SUTR Schema

**Objective:** Get definitive list of all columns, types, and relationships from running SUTR database.

**How:**
```bash
# Connect to SUTR MySQL DB
mysql -u root -p sutr_db -e "
  SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'sutr_db'
  ORDER BY TABLE_NAME, ORDINAL_POSITION;
" > sutr_schema_export.sql
```

**Deliverable:** `docs/SUTR_SCHEMA_EXTRACT.sql` (checked into repo)

**Owner:** Database admin or migration lead

---

### Prep Task 2: Document SUTR Role & Status Enums

**Objective:** Confirm exact mappings for `users.tipo` and `estatus` fields across tables.

**How:**
```bash
# SUTR codebase grep
cd /path/to/sutr
grep -r "tipo.*==" app/ routes/ | head -20  # Find role checks
grep -r "estatus.*==" app/ routes/ | head -20  # Find status checks
```

**Deliverable:** `docs/SUTR_ENUM_MAPPINGS.md`

**Example:**
```markdown
## Users.tipo
- 1 = Super Admin (all operations)
- 2 = Admin (all units)
- 3 = Manager (one unit)
- 4 = Staff (data entry, one unit)

## Estatus (generic)
- 1 = Active / Enabled
- 2 = Inactive / Suspended / Disabled
```

**Owner:** SUTR architect or business analyst

---

### Prep Task 3: Define ClinicalTemplate Hemodialysis Fields

**Objective:** Create complete, ordered list of 48 dialysis fields with metadata.

**How:**
1. Export from `sesions` and `signos` schema
2. Map to Zod schema in `@repo/types`
3. Create seed file for Renalfy

**Deliverable:** `packages/types/src/clinicalTemplate.schemas.ts`

**Example:**
```typescript
export const HemodialysisFieldSchema = z.object({
  peso_seco: z.number().positive(),
  ktv: z.string().optional(),
  // ... all 48 fields
});

export const ClinicalTemplateFieldDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["string", "integer", "decimal", "date", "boolean"]),
  unit: z.string().optional(),
  required: z.boolean(),
  order: z.number().int().min(1).max(48),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  pattern: z.string().optional(),
  description: z.string().optional(),
});
```

**Owner:** Backend lead

---

### Prep Task 4: Build Migration Script Skeleton (Node.js/NestJS CLI)

**Objective:** Create a command-line tool that can migrate SUTR DB → Renalfy DB.

**Location:** `apps/api/scripts/migrate-sutr.ts`

**Structure:**
```typescript
// apps/api/scripts/migrate-sutr.ts
import { PrismaClient } from '@prisma/client';
import { MySQLClient } from 'mysql2/promise';

interface MigrationConfig {
  sutrDbUrl: string;      // Source DB
  renalfyDbUrl: string;   // Target DB
  tenantId: string;       // Renalfy tenant to migrate into
  dryRun: boolean;        // If true, don't commit
}

async function migrate(config: MigrationConfig): Promise<void> {
  // 1. Pre-flight checks
  // 2. Connect to both DBs
  // 3. Extract SUTR data
  // 4. Transform
  // 5. Load into Renalfy
  // 6. Validate
  // 7. Report
}

async function main() {
  const config: MigrationConfig = {
    sutrDbUrl: process.env.SUTR_DATABASE_URL!,
    renalfyDbUrl: process.env.DATABASE_URL!,
    tenantId: process.env.RENALFY_TENANT_ID!,
    dryRun: process.env.DRY_RUN === 'true',
  };

  await migrate(config);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Run:**
```bash
cd apps/api
SUTR_DATABASE_URL="mysql://..." \
DATABASE_URL="postgresql://..." \
RENALFY_TENANT_ID="sutr-tenant-id" \
DRY_RUN=true \
npm run migrate-sutr
```

**Owner:** Backend lead

**Deliverable:** Script compiles, connects to both DBs, extracts and logs row counts.

---

### Prep Task 5: ID Mapping Infrastructure

**Objective:** Create temporary mapping table in Renalfy to track SUTR → Renalfy IDs.

**Schema:**
```prisma
// Temporary model (drop after migration)
model MigrationIdMap {
  id              String  @id @default(uuid())
  sutrTable       String
  sutrId          Int     @db.Integer
  renalfyId       String
  createdAt       DateTime @default(now())

  @@unique([sutrTable, sutrId])
  @@index([sutrTable, sutrId])
}
```

**Rationale:**
- Track every ID transformation
- Enables foreign key resolution
- Allows rollback & re-migration

**Deliverable:** Migration script creates/drops table automatically.

---

## Phase 2: Migration Script Development (Sprint 27–28)

### Dev Task 1: User & Auth Migration

**What:** Extract SUTR users → Renalfy User records

**Script section:**
```typescript
async function migrateUsers(sutrDb, renalfyDb, config) {
  const users = await sutrDb.query('SELECT * FROM users');

  for (const user of users) {
    const renalfyUser = await renalfyDb.user.create({
      data: {
        tenantId: config.tenantId,
        name: user.name,
        email: user.email,
        password: await hashPassword(generateRandomPassword()), // Force reset
        role: mapRole(user.tipo),
        phone: user.telefono || null,
        avatarUrl: null, // User re-uploads avatar
        status: mapStatus(user.estatus),
        locationId: user.unidad_id ? await mapLocationId(user.unidad_id) : null,
      },
    });

    await recordIdMapping('users', user.id, renalfyUser.id);
    logLine(`✓ User ${user.email} → ${renalfyUser.id}`);
  }
}
```

**Validation:**
- All emails must be unique (per tenant)
- All roles must be valid enum values
- No missing required fields

**Deliverable:** Users + passwordReset notification emails queued.

---

### Dev Task 2: Location & Organization Migration

**What:** Extract SUTR unidades → Renalfy Location records

**Script section:**
```typescript
async function migrateLocations(sutrDb, renalfyDb, config) {
  const locations = await sutrDb.query('SELECT * FROM unidads');

  for (const loc of locations) {
    const renalfyLoc = await renalfyDb.location.create({
      data: {
        tenantId: config.tenantId,
        name: loc.nombre,
        address: loc.direccion || null,
        phone: null, // SUTR doesn't have location phone
        status: loc.estatus === 1 ? 'active' : 'inactive',
      },
    });

    await recordIdMapping('unidads', loc.id, renalfyLoc.id);
    logLine(`✓ Location ${loc.nombre} → ${renalfyLoc.id}`);
  }

  config.primaryLocationId = (
    await renalfyDb.location.findFirst({
      where: { tenantId: config.tenantId },
      orderBy: { createdAt: 'asc' },
    })
  )?.id;
}
```

**Validation:**
- At least one location created
- Primary location identified

---

### Dev Tasks 3–11: Remaining entities

(Follow same pattern as above for each entity group)

**Order:**
1. Locations (dependency: none)
2. ServiceTypes (dependency: none)
3. Patients (dependency: Location)
4. PatientConsent (dependency: Patient)
5. Appointments (dependency: Receipt, Patient, ServiceType)
6. Measurements (dependency: Appointment)
7. Receipts (dependency: Patient, Location, User)
8. Companies (dependency: none)
9. Plans (dependency: Company, Patient, ServiceType)
10. Products (dependency: none)
11. LocationStock (dependency: Product, Location)
12. Suppliers (dependency: none)
13. SupplierProduct (dependency: Supplier, Product)
14. PurchaseOrders (dependency: Location, User)
15. PurchaseOrderItems (dependency: PurchaseOrder, Product)
16. Purchases (dependency: Supplier, User)
17. PurchaseItems (dependency: Purchase, Product)
18. InventoryMovements (dependency: Location, User)
19. InventoryMovementItems (dependency: InventoryMovement, Product)
20. Sales (dependency: Location, User)
21. SaleItems (dependency: Sale, Product)
22. Income (dependency: Location, User)
23. Expenses (dependency: Location, User)
24. CashClose (dependency: Location, User)

---

## Phase 3: Testing & Validation (Sprint 28–29)

### Validation Task 1: Referential Integrity

**Check:**
```sql
-- Sample queries to validate FKs
SELECT COUNT(*) FROM Receipt WHERE patientId NOT IN (SELECT id FROM Patient);
SELECT COUNT(*) FROM Appointment WHERE receiptId NOT IN (SELECT id FROM Receipt);
-- ... etc for all FK relationships
```

**Deliverable:** Report showing 0 orphaned records.

---

### Validation Task 2: Business Logic Spot Checks

**Checks:**
1. Receipt folios are sequential per location/year
2. Plans with exhausted sessions marked correctly
3. Stock quantities match sum of movements
4. Cash close totals = sum of linked sales/income/expenses
5. All appointments have valid clinical templates

**Deliverable:** Validation report, all checks passed.

---

### Validation Task 3: Data Completeness

**Checks:**
1. Row count comparison: SUTR → Renalfy (before/after)
2. No NULL in required fields
3. Email uniqueness enforced
4. Patient consent for all patients

**Deliverable:** Coverage report (98%+ match expected).

---

## Phase 4: Go-Live Checklist (Sprint 30)

- [ ] Schema migrations deployed to prod
- [ ] Migration script tested on prod backup
- [ ] Rollback plan documented and tested
- [ ] DNS/subdomain `sutr.renalfy.app` ready
- [ ] User communication sent (maintenance window, new URL)
- [ ] Support team trained on Renalfy UI
- [ ] Backup of old SUTR DB taken
- [ ] Migration dry-run completed
- [ ] Migration executed (prod)
- [ ] Validation queries run
- [ ] Sample users can log in
- [ ] Sample data visible in UI
- [ ] Audit log entries visible
- [ ] Alerts/monitoring enabled
- [ ] Go/no-go decision by stakeholders

---

## Timeline Summary

| Phase | Duration | Effort | Deliverable |
|---|---|---|---|
| Phase 0: Decisions | 3–5 days | Low | Documented decisions, schema tweaks |
| Phase 0.5: Schema | 3–5 days | Low | Updated schema.prisma, migrations applied |
| Phase 1: Prep | 5 days | Medium | Schema extracted, mappings defined, script skeleton |
| Phase 2: Dev | 10 days | High | Full migration script, tested on sample data |
| Phase 3: Validation | 5 days | Medium | Validation reports, all checks passing |
| Phase 4: Cutover | 1 day | Low | Production migration, go-live |

**Total:** ~4 weeks (Sprints 27–30)

---

## Success Criteria

- ✅ All SUTR data migrated to Renalfy
- ✅ No data loss (except intentional cleaning)
- ✅ Referential integrity 100%
- ✅ Business logic validated
- ✅ Users can log in and see their data
- ✅ Audit trail shows migration timestamp
- ✅ Performance acceptable (< 5s page loads)
- ✅ Compliance requirements met (consent, audit logs)

---

## Owners & Sign-Offs

| Role | Name | Responsibility |
|---|---|---|
| **Migration Lead** | (TBD) | Overall orchestration, decision-making |
| **Backend Engineer** | (TBD) | Script development, testing |
| **Database Admin** | (TBD) | Schema prep, backup/restore, performance |
| **QA Lead** | (TBD) | Validation, testing |
| **Product Owner** | (TBD) | Scope, cutover timing |
| **Legal/Compliance** | (TBD) | Consent strategy, audit trail approval |

---

**Next Step:** Schedule sync with team to confirm decisions and assign owners.
