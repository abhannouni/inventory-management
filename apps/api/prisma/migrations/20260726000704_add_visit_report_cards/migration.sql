-- CreateEnum
CREATE TYPE "VisitReportCategory" AS ENUM ('display', 'tg', 'mea', 'plv');

-- CreateTable
CREATE TABLE "visit_report_cards" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "category" "VisitReportCategory" NOT NULL,
    "note" TEXT,
    "photos" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_report_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visit_report_cards_visit_id_idx" ON "visit_report_cards"("visit_id");

-- AddForeignKey
ALTER TABLE "visit_report_cards" ADD CONSTRAINT "visit_report_cards_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
