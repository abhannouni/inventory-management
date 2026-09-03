-- The "Synthèse" slide of the price survey has been removed entirely.
-- Drop its free-text note storage and the associated side enum.

-- DropTable
DROP TABLE "price_survey_notes";

-- DropEnum
DROP TYPE "PriceSurveyNoteSide";
