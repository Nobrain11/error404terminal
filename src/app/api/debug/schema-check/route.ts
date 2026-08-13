// src/app/api/debug/schema-check/route.ts
// TEMPORARY — checks the real Postgres column type for User.telegramId.
// Delete this file once you've confirmed the fix; it's diagnostic only.

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const result = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User';`
    );
    return NextResponse.json({ columns: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
