/*
  Warnings:

  - A unique constraint covering the columns `[tracking_code]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tracking_code` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RepairStage" AS ENUM ('DROPPED_OFF', 'DIAGNOSING', 'WAITING_ON_PARTS', 'REPAIRING', 'READY_FOR_PICKUP');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "repair_stage" "RepairStage" NOT NULL DEFAULT 'DROPPED_OFF',
ADD COLUMN     "tracking_code" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_tracking_code_key" ON "tickets"("tracking_code");
