-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "ReceiptFolioCounter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptFolioCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptFolioCounter_tenantId_locationId_year_key" ON "ReceiptFolioCounter"("tenantId", "locationId", "year");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
