-- Row-Level Security for Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Supplier";
CREATE POLICY tenant_isolation ON "Supplier"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

ALTER TABLE "SupplierProduct" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SupplierProduct";
CREATE POLICY tenant_isolation ON "SupplierProduct"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PurchaseOrder";
CREATE POLICY tenant_isolation ON "PurchaseOrder"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- PurchaseOrderItem inherits tenantId via JOIN to PurchaseOrder → handled by application-level filtering
-- No separate RLS needed for PurchaseOrderItem