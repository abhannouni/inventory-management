-- AlterTable
ALTER TABLE "visits" ADD COLUMN "schedule_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "visits_schedule_id_key" ON "visits"("schedule_id");

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
