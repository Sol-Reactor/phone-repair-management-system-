-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "DefectiveStatus" AS ENUM ('WAITING_FOR_REFUND', 'REFUNDED');

-- AlterTable
ALTER TABLE "wholesale_items" ADD COLUMN     "min_stock_level" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restock_log" (
    "id" SERIAL NOT NULL,
    "wholesale_item_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "quantity_added" INTEGER NOT NULL,
    "unit_cost_price" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restock_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defective_log" (
    "id" SERIAL NOT NULL,
    "wholesale_item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reported_by" TEXT NOT NULL,
    "status" "DefectiveStatus" NOT NULL DEFAULT 'WAITING_FOR_REFUND',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defective_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "suppliers_phone_idx" ON "suppliers"("phone");

-- CreateIndex
CREATE INDEX "restock_log_wholesale_item_id_idx" ON "restock_log"("wholesale_item_id");

-- CreateIndex
CREATE INDEX "restock_log_supplier_id_idx" ON "restock_log"("supplier_id");

-- CreateIndex
CREATE INDEX "restock_log_created_at_idx" ON "restock_log"("created_at");

-- CreateIndex
CREATE INDEX "defective_log_wholesale_item_id_idx" ON "defective_log"("wholesale_item_id");

-- CreateIndex
CREATE INDEX "defective_log_status_idx" ON "defective_log"("status");

-- CreateIndex
CREATE INDEX "defective_log_created_at_idx" ON "defective_log"("created_at");

-- AddForeignKey
ALTER TABLE "restock_log" ADD CONSTRAINT "restock_log_wholesale_item_id_fkey" FOREIGN KEY ("wholesale_item_id") REFERENCES "wholesale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_log" ADD CONSTRAINT "restock_log_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defective_log" ADD CONSTRAINT "defective_log_wholesale_item_id_fkey" FOREIGN KEY ("wholesale_item_id") REFERENCES "wholesale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
