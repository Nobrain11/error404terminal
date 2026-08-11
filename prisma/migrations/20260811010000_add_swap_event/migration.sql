CREATE TABLE "SwapEvent" (
    "id" TEXT NOT NULL,
    "pairAddress" TEXT NOT NULL,
    "tokenCa" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "isBuy" BOOLEAN NOT NULL,
    "rawRatio" DOUBLE PRECISION NOT NULL,
    "ourAmount" DOUBLE PRECISION NOT NULL,
    "otherAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwapEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SwapEvent_txHash_logIndex_key" ON "SwapEvent"("txHash", "logIndex");
CREATE INDEX "SwapEvent_pairAddress_timestamp_idx" ON "SwapEvent"("pairAddress", "timestamp");
