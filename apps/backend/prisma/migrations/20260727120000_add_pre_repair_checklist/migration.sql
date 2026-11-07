-- CreateEnum
CREATE TYPE "ScreenCondition" AS ENUM ('SCRATCHED', 'CRACKED', 'PERFECT');

-- CreateTable
CREATE TABLE "pre_repair_checklists" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "screen_condition" "ScreenCondition" NOT NULL,
    "touch_faceid_working" BOOLEAN NOT NULL,
    "cameras_working" BOOLEAN NOT NULL,
    "charging_port_working" BOOLEAN NOT NULL,
    "technician_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_repair_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pre_repair_checklists_ticket_id_key" ON "pre_repair_checklists"("ticket_id");

-- AddForeignKey
ALTER TABLE "pre_repair_checklists" ADD CONSTRAINT "pre_repair_checklists_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
