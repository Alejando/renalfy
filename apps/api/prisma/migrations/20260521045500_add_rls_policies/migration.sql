-- Row-Level Security migration for multi-tenant isolation
-- This migration enables RLS on all tables with a tenantId column
-- and creates policies that enforce tenant-scoped access.

-- 0. Create app schema for RLS helper function
CREATE SCHEMA IF NOT EXISTS app;

-- 1. Helper function to read current tenant from session context
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$ LANGUAGE sql STABLE;

-- 2. Enable RLS and create policies for each tenant-scoped table

-- Appointment
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Appointment" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- AuditLog (append-only: SELECT + INSERT, no UPDATE/DELETE)
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON "AuditLog" FOR SELECT
  USING ("tenantId" = app.current_tenant_id() OR "tenantId" IS NULL);
CREATE POLICY audit_insert ON "AuditLog" FOR INSERT
  WITH CHECK ("tenantId" = app.current_tenant_id() OR "tenantId" IS NULL);

-- CashClose
ALTER TABLE "CashClose" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CashClose" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- ClinicalTemplate
ALTER TABLE "ClinicalTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ClinicalTemplate" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Company
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Company" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Expense
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Expense" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Income
ALTER TABLE "Income" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Income" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- InventoryMovement
ALTER TABLE "InventoryMovement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InventoryMovement" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Location
ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Location" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- LocationStock
ALTER TABLE "LocationStock" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LocationStock" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Measurement
ALTER TABLE "Measurement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Measurement" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Patient
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Patient" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- PatientConsent
ALTER TABLE "PatientConsent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PatientConsent" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Plan
ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Plan" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Product
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Product" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- ProductCategory
ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ProductCategory" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Purchase
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Purchase" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- PurchaseOrder
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PurchaseOrder" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Receipt
ALTER TABLE "Receipt" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Receipt" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- ReceiptFolioCounter
ALTER TABLE "ReceiptFolioCounter" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ReceiptFolioCounter" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Sale
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Sale" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- ServiceType
ALTER TABLE "ServiceType" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ServiceType" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- Supplier
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Supplier" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- SupplierProduct
ALTER TABLE "SupplierProduct" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SupplierProduct" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- TenantSettings
ALTER TABLE "TenantSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TenantSettings" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());

-- User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "User" FOR ALL
  USING ("tenantId" = app.current_tenant_id())
  WITH CHECK ("tenantId" = app.current_tenant_id());
