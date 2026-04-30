-- AddColumn supplierId to PurchaseOrder
ALTER TABLE "PurchaseOrder" ADD COLUMN "supplierId" TEXT NOT NULL;

-- Add foreign key constraint
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
