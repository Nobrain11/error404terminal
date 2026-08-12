import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, signRefresh } from "@/lib/jwt";
import { verifyTelegramInitData } from "@/lib/telegram-auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { initData, telegramId, username } = body;

  let resolvedTelegramId: string;
  let resolvedUsername: string | undefined;

  if (initData) {
    const verified = verifyTelegramInitData(initData);
    if (!verified) {
      return NextResponse.json({ error: "Invalid Telegram signature" }, { status: 401 });
    }
    resolvedTelegramId = String(verified.user.id);
    resolvedUsername = verified.user.username;
  } else if (telegramId) {
    // Fallback for server-to-server calls (e.g. from the bot itself)
    resolvedTelegramId = String(telegramId);
    resolvedUsername = username;
  } else {
    return NextResponse.json({ error: "Missing initData or telegramId" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { telegramId: resolvedTelegramId },
    update: { username: resolvedUsername },
    create: { telegramId: resolvedTelegramId, username: resolvedUsername },
  });

  const wallet = await prisma.wallet.findFirst({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { address: true, name: true },
  });

  const token = signToken({ userId: user.id });
  const refresh = signRefresh({ userId: user.id });

  return NextResponse.json({
    token,
    refresh,
    user: { id: user.id, telegramId: user.telegramId, username: user.username },
    wallet: wallet || null,
  });
}
