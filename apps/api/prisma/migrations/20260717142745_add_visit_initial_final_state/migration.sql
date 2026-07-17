-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "final_note" TEXT,
ADD COLUMN     "final_photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "initial_note" TEXT,
ADD COLUMN     "initial_photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
