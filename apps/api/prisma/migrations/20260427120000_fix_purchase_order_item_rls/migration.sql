-- Fix RLS policy for PurchaseOrderItem (child table without direct tenantId)
-- The previous migration incorrectly stated "No separate RLS needed for PurchaseOrderItem"
-- PostgreSQL RLS requires explicit policies even for child tables that JOIN to a parent.
-- Without this policy, all INSERT/UPDATE/DELETE on PurchaseOrderItem are blocked for renalfy_app.

-- Drop any existing policy first (idempotent)
DROP POLICY IF EXISTS tenant_isolation ON "PurchaseOrderItem";

-- Create JOIN-based policy that checks tenantId through the parent PurchaseOrder
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
