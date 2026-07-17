-- AlterTable
ALTER TABLE "users" ADD COLUMN     "supervisor_id" TEXT;

-- CreateIndex
CREATE INDEX "users_supervisor_id_idx" ON "users"("supervisor_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
