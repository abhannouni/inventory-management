-- Sell-out entries are re-seeded, safe to clear before reshaping the table.
DELETE FROM "sell_outs";

ALTER TABLE "sell_outs" DROP COLUMN "stock";

ALTER TABLE "sell_outs" ADD COLUMN "store_id" TEXT NOT NULL;

CREATE INDEX "sell_outs_store_id_idx" ON "sell_outs"("store_id");

ALTER TABLE "sell_outs" ADD CONSTRAINT "sell_outs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
