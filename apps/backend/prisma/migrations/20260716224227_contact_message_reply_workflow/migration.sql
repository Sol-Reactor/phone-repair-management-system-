/*
  Warnings:

  - You are about to drop the column `is_read` on the `contact_messages` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED');

-- AlterTable
ALTER TABLE "contact_messages" DROP COLUMN "is_read",
ADD COLUMN     "replied_at" TIMESTAMP(3),
ADD COLUMN     "reply_text" TEXT,
ADD COLUMN     "status" "ContactMessageStatus" NOT NULL DEFAULT 'UNREAD',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");
