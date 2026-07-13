-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "duration_seconds" INTEGER;

-- CreateIndex
CREATE INDEX "visits_user_id_status_idx" ON "visits"("user_id", "status");

-- Backfill duration for visits that were already completed before this column existed,
-- using the same formula the service applies: checkout_time - checkin_time, in seconds.
UPDATE "visits"
SET "duration_seconds" = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM ("checkout_time" - "checkin_time")))::INTEGER)
WHERE "checkout_time" IS NOT NULL
  AND "duration_seconds" IS NULL;

-- Enforce "one open visit per user" in the database, not just in application code.
-- A partial unique index lets a user hold many completed visits but only one open one,
-- so two concurrent check-ins cannot both slip past the service-level check.
CREATE UNIQUE INDEX "visits_one_open_per_user"
  ON "visits"("user_id")
  WHERE "status" = 'open';
