
-- CreateEnum
CREATE TYPE "MonthlyPlanStatus" AS ENUM ('draft', 'pending_review', 'approved', 'declined');

-- CreateEnum
CREATE TYPE "MonthlyPlanEntryStatus" AS ENUM ('pending', 'completed', 'cancelled');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'monthly_plan_submitted';
ALTER TYPE "NotificationType" ADD VALUE 'monthly_plan_changed';
ALTER TYPE "NotificationType" ADD VALUE 'monthly_plan_approved';
ALTER TYPE "NotificationType" ADD VALUE 'monthly_plan_declined';
ALTER TYPE "NotificationType" ADD VALUE 'monthly_plan_adjusted';
ALTER TYPE "NotificationType" ADD VALUE 'monthly_plan_reminder';
ALTER TYPE "NotificationType" ADD VALUE 'monthly_plan_missing';

-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "monthly_plan_entry_id" TEXT;

-- CreateTable
CREATE TABLE "monthly_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "MonthlyPlanStatus" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "approved_snapshot" JSONB,
    "reminder_sent_at" TIMESTAMP(3),
    "missing_alert_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_plan_entries" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "store_id" TEXT NOT NULL,
    "notes" TEXT,
    "status" "MonthlyPlanEntryStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_plan_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_plans_status_idx" ON "monthly_plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_plans_user_id_year_month_key" ON "monthly_plans"("user_id", "year", "month");

-- CreateIndex
CREATE INDEX "monthly_plan_entries_plan_id_idx" ON "monthly_plan_entries"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "visits_monthly_plan_entry_id_key" ON "visits"("monthly_plan_entry_id");

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_monthly_plan_entry_id_fkey" FOREIGN KEY ("monthly_plan_entry_id") REFERENCES "monthly_plan_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plans" ADD CONSTRAINT "monthly_plans_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plan_entries" ADD CONSTRAINT "monthly_plan_entries_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "monthly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_plan_entries" ADD CONSTRAINT "monthly_plan_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

