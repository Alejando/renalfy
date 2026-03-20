-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security — Renalfy
--
-- Estrategia:
--   • El usuario de aplicación (renalfy_app) conecta sin privilegios especiales.
--   • Antes de ejecutar queries, el interceptor de NestJS hace:
--       SELECT set_config('app.current_tenant_id', '<uuid>', false)
--   • Cada política RLS compara "tenantId" con ese valor de sesión.
--   • El superusuario 'renalfy' (usado en migraciones) tiene BYPASSRLS
--     implícito por ser superusuario — nunca lo usamos en runtime.
--
-- Tablas con tenantId directo:
--   User, Location, TenantSettings, Patient, ServiceType, Receipt, Appointment,
--   Measurement, ClinicalTemplate, Company, Plan, Product, LocationStock,
--   Supplier, SupplierProduct, PurchaseOrder, Purchase, InventoryMovement,
--   Sale, Income, Expense, CashClose
--
-- Tablas hijo (sin tenantId, acceso via JOIN al padre):
--   PurchaseOrderItem, PurchaseItem, InventoryMovementItem, SaleItem
--
-- Tabla de plataforma (sin RLS — necesaria para lookup de tenant en login):
--   Tenant
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: devuelve el tenant_id de la sesión actual o NULL si no está seteado
-- Retorna TEXT para coincidir con las columnas tenantId generadas por Prisma (TEXT)
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$ LANGUAGE sql STABLE;

-- ─── Tablas con tenantId directo ─────────────────────────────────────────────

DO $$ DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'User', 'Location', 'TenantSettings',
    'Patient', 'ServiceType', 'Receipt', 'Appointment',
    'Measurement', 'ClinicalTemplate',
    'Company', 'Plan',
    'Product', 'LocationStock', 'Supplier', 'SupplierProduct',
    'PurchaseOrder', 'Purchase', 'InventoryMovement',
    'Sale', 'Income', 'Expense', 'CashClose'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("tenantId" = current_tenant_id())
         WITH CHECK ("tenantId" = current_tenant_id())',
      t
    );
  END LOOP;
END $$;

-- ─── Tablas hijo — SaleItem ───────────────────────────────────────────────────

ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SaleItem";
CREATE POLICY tenant_isolation ON "SaleItem"
  USING (
    EXISTS (
      SELECT 1 FROM "Sale" s
      WHERE s.id = "SaleItem"."saleId"
        AND s."tenantId" = current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Sale" s
      WHERE s.id = "SaleItem"."saleId"
        AND s."tenantId" = current_tenant_id()
    )
  );

-- ─── Tablas hijo — PurchaseOrderItem ─────────────────────────────────────────

ALTER TABLE "PurchaseOrderItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PurchaseOrderItem";
CREATE POLICY tenant_isolation ON "PurchaseOrderItem"
  USING (
    EXISTS (
      SELECT 1 FROM "PurchaseOrder" po
      WHERE po.id = "PurchaseOrderItem"."purchaseOrderId"
        AND po."tenantId" = current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PurchaseOrder" po
      WHERE po.id = "PurchaseOrderItem"."purchaseOrderId"
        AND po."tenantId" = current_tenant_id()
    )
  );

-- ─── Tablas hijo — PurchaseItem ───────────────────────────────────────────────

ALTER TABLE "PurchaseItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PurchaseItem";
CREATE POLICY tenant_isolation ON "PurchaseItem"
  USING (
    EXISTS (
      SELECT 1 FROM "Purchase" p
      WHERE p.id = "PurchaseItem"."purchaseId"
        AND p."tenantId" = current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Purchase" p
      WHERE p.id = "PurchaseItem"."purchaseId"
        AND p."tenantId" = current_tenant_id()
    )
  );

-- ─── Tablas hijo — InventoryMovementItem ─────────────────────────────────────

ALTER TABLE "InventoryMovementItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "InventoryMovementItem";
CREATE POLICY tenant_isolation ON "InventoryMovementItem"
  USING (
    EXISTS (
      SELECT 1 FROM "InventoryMovement" im
      WHERE im.id = "InventoryMovementItem"."inventoryMovementId"
        AND im."tenantId" = current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "InventoryMovement" im
      WHERE im.id = "InventoryMovementItem"."inventoryMovementId"
        AND im."tenantId" = current_tenant_id()
    )
  );

-- ─── Tabla de plataforma: Tenant (sin RLS) ────────────────────────────────────
-- El interceptor necesita leer Tenant antes de conocer el tenant_id (ej: login).
-- La seguridad aquí es a nivel de aplicación (solo SUPER_ADMIN puede mutarla).

-- ─── PatientConsent ───────────────────────────────────────────────────────────

ALTER TABLE "PatientConsent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PatientConsent";
CREATE POLICY tenant_isolation ON "PatientConsent"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- ─── AuditLog — APPEND-ONLY ───────────────────────────────────────────────────
-- Solo se permite SELECT e INSERT. No hay políticas de UPDATE ni DELETE,
-- por lo que esas operaciones quedan bloqueadas para renalfy_app.
-- Esto garantiza la inmutabilidad requerida por NOM-004.

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_read ON "AuditLog";
CREATE POLICY audit_read ON "AuditLog"
  FOR SELECT
  USING (
    "tenantId" = current_tenant_id()
    OR "tenantId" IS NULL  -- eventos de plataforma visibles para super_admin
  );

DROP POLICY IF EXISTS audit_insert ON "AuditLog";
CREATE POLICY audit_insert ON "AuditLog"
  FOR INSERT
  WITH CHECK (
    "tenantId" = current_tenant_id()
    OR "tenantId" IS NULL
  );

-- Sin política UPDATE → bloqueado
-- Sin política DELETE → bloqueado
