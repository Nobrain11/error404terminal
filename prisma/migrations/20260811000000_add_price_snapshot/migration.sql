CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "tokenCa" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PriceSnapshot_tokenCa_timestamp_idx" ON "PriceSnapshot"("tokenCa", "timestamp");
