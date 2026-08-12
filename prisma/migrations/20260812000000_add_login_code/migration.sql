CREATE TABLE "LoginCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginCode_code_key" ON "LoginCode"("code");
