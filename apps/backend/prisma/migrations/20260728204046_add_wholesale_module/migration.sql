-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'LOAN');

-- CreateTable
CREATE TABLE "wholesale_items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_technicians" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "shop_location" TEXT NOT NULL,
    "total_debt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_ledger" (
    "id" SERIAL NOT NULL,
    "wholesale_item_id" INTEGER NOT NULL,
    "external_technician_id" INTEGER NOT NULL,
    "quantity_taken" INTEGER NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance_due" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_status" "PaymentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wholesale_items_category_idx" ON "wholesale_items"("category");

-- CreateIndex
CREATE INDEX "wholesale_items_name_idx" ON "wholesale_items"("name");

-- CreateIndex
CREATE INDEX "external_technicians_phone_idx" ON "external_technicians"("phone");

-- CreateIndex
CREATE INDEX "external_technicians_total_debt_idx" ON "external_technicians"("total_debt");

-- CreateIndex
CREATE INDEX "distribution_ledger_external_technician_id_idx" ON "distribution_ledger"("external_technician_id");

-- CreateIndex
CREATE INDEX "distribution_ledger_wholesale_item_id_idx" ON "distribution_ledger"("wholesale_item_id");

-- CreateIndex
CREATE INDEX "distribution_ledger_payment_status_idx" ON "distribution_ledger"("payment_status");

-- CreateIndex
CREATE INDEX "distribution_ledger_created_at_idx" ON "distribution_ledger"("created_at");

-- AddForeignKey
ALTER TABLE "distribution_ledger" ADD CONSTRAINT "distribution_ledger_wholesale_item_id_fkey" FOREIGN KEY ("wholesale_item_id") REFERENCES "wholesale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_ledger" ADD CONSTRAINT "distribution_ledger_external_technician_id_fkey" FOREIGN KEY ("external_technician_id") REFERENCES "external_technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
