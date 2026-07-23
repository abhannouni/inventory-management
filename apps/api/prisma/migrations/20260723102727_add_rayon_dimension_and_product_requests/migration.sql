-- CreateTable
CREATE TABLE "rayon_dimensions" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "sous_famille" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rayon_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_requests" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "sous_famille" TEXT NOT NULL,
    "width" DECIMAL(10,2) NOT NULL,
    "height" DECIMAL(10,2) NOT NULL,
    "depth" DECIMAL(10,2) NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rayon_dimensions_store_id_idx" ON "rayon_dimensions"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "rayon_dimensions_store_id_sous_famille_key" ON "rayon_dimensions"("store_id", "sous_famille");

-- CreateIndex
CREATE INDEX "product_requests_store_id_idx" ON "product_requests"("store_id");

-- AddForeignKey
ALTER TABLE "rayon_dimensions" ADD CONSTRAINT "rayon_dimensions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rayon_dimensions" ADD CONSTRAINT "rayon_dimensions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_requests" ADD CONSTRAINT "product_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_requests" ADD CONSTRAINT "product_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
