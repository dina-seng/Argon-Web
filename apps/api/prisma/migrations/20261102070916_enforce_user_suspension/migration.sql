-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_isSuspended_idx" ON "User"("isSuspended");
