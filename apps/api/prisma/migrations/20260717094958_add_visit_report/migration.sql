-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "report_note" TEXT,
ADD COLUMN     "report_photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "report_title" TEXT;
