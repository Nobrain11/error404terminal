// src/app/api/debug/fix-telegram-id/route.ts
// TEMPORARY — one-time fix for the telegramId column type mismatch.
// Visit this URL ONCE, confirm it says success, then delete this file.

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check current type first
    const before = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'telegramId';`
    );

    if (before[0]?.data_type === "text" || before[0]?.data_type === "character varying") {
      return NextResponse.json({
        message: "telegramId is already the correct type — no fix needed.",
        currentType: before[0]?.data_type,
      });
    }

    // Fix it
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ALTER COLUMN "telegramId" TYPE TEXT USING "telegramId"::TEXT;`
    );

    const after = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'telegramId';`
    );

    return NextResponse.json({
      message: "Fixed successfully.",
      before: before[0]?.data_type,
      after: after[0]?.data_type,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
