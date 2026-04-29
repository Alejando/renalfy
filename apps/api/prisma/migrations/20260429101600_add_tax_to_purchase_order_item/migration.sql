-- Add tax column to PurchaseOrderItem table
-- The tax field is required for the receive-items workflow in Phase 4 (US2 - Receive Purchase)
-- Default value is 0 to preserve existing data

ALTER TABLE "PurchaseOrderItem" ADD COLUMN "tax" DECIMAL(10,2) NOT NULL DEFAULT 0;
