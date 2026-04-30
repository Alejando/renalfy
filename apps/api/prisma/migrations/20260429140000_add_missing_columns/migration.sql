-- Add missing columns to PurchaseOrder
ALTER TABLE "PurchaseOrder" ADD COLUMN "expectedDate" TIMESTAMP(3),
ADD COLUMN "total" DECIMAL(10,2) NOT NULL DEFAULT 0;
