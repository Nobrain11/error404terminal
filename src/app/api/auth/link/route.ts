import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, signRefresh } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const loginCode = await prisma.loginCode.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!loginCode) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }
  if (loginCode.used) {
    return NextResponse.json({ error: "Code already used" }, { status: 401 });
  }
  if (loginCode.expiresAt < new Date()) {
    return NextResponse.json({ error: "Code expired" }, { status: 401 });
  }

  await prisma.loginCode.update({
    where: { id: loginCode.id },
    data: { used: true },
  });

  const user = await prisma.user.findUnique({
    where: { telegramId: loginCode.telegramId },
  });

  if (!user) {
    return NextResponse.json({ error: "No account found for this code" }, { status: 404 });
  }

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
