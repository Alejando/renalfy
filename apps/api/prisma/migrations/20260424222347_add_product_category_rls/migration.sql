-- Row-Level Security for ProductCategory table
ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ProductCategory";
CREATE POLICY tenant_isolation ON "ProductCategory"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());
