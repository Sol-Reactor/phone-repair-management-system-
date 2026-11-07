-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'DONE', 'COLLECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "device_brand" TEXT NOT NULL,
    "device_model" TEXT NOT NULL,
    "repair_type_id" INTEGER NOT NULL,
    "problem_description" TEXT NOT NULL,
    "device_pin" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'WAITING',
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "estimated_start_time" TIMESTAMP(3),
    "estimated_cost" DECIMAL(10,2) NOT NULL,
    "actual_cost" DECIMAL(10,2),
    "queue_position" INTEGER,
    "notes" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "estimated_duration_minutes" INTEGER NOT NULL,

    CONSTRAINT "repair_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list" (
    "id" SERIAL NOT NULL,
    "repair_type_id" INTEGER NOT NULL,
    "device_brand" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "customers_phone_number_idx" ON "customers"("phone_number");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_queue_position_idx" ON "tickets"("queue_position");

-- CreateIndex
CREATE INDEX "tickets_registered_at_idx" ON "tickets"("registered_at");

-- CreateIndex
CREATE UNIQUE INDEX "repair_types_name_key" ON "repair_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_repair_type_id_device_brand_key" ON "price_list"("repair_type_id", "device_brand");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "repair_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list" ADD CONSTRAINT "price_list_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "repair_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
