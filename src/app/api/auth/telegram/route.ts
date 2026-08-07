import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, signRefresh } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const { telegramId, username } = await req.json();

  if (!telegramId) {
    return NextResponse.json({ error: "Missing telegramId" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { telegramId: String(telegramId) },
    update: { username },
    create: { telegramId: String(telegramId), username },
  });

  const token = signToken({ userId: user.id });
  const refresh = signRefresh({ userId: user.id });

  return NextResponse.json({ token, refresh, user });
}
