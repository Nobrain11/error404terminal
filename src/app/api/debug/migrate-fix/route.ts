// src/app/api/debug/migrate-fix/route.ts
// TEMPORARY — applies all pending raw-SQL schema fixes in one shot.
// Visit once, confirm "success", then delete this file.

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const results: Record<string, string> = {};

  try {
    // 1. Fix telegramId column type (root cause of the 22P03 errors)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ALTER COLUMN "telegramId" TYPE TEXT USING "telegramId"::TEXT;`
    );
    // telegramId also needs to allow NULL now (schema says String?)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ALTER COLUMN "telegramId" DROP NOT NULL;`
    );
    results.telegramId = "fixed — now nullable TEXT";
  } catch (err) {
    results.telegramId = `error (may already be correct): ${err instanceof Error ? err.message : String(err)}`;
  }

  try {
    // 2. Wallet.encryptedKey needs to allow NULL (connected wallets have no stored key)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Wallet" ALTER COLUMN "encryptedKey" DROP NOT NULL;`
    );
    results.encryptedKey = "fixed — now nullable";
  } catch (err) {
    results.encryptedKey = `error (may already be correct): ${err instanceof Error ? err.message : String(err)}`;
  }

  try {
    // 3. Create WalletNonce table if it doesn't exist yet
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WalletNonce" (
        "id" TEXT NOT NULL,
        "address" TEXT NOT NULL,
        "nonce" TEXT NOT NULL,
        "used" BOOLEAN NOT NULL DEFAULT false,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WalletNonce_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "WalletNonce_nonce_key" ON "WalletNonce"("nonce");`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "WalletNonce_address_idx" ON "WalletNonce"("address");`
    );
    results.walletNonce = "created (or already existed)";
  } catch (err) {
    results.walletNonce = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({ message: "Migration attempt complete", results });
}
