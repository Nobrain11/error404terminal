import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buyToken } from "@/services/trading";
import { verifyToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")?.split(" ")[1];
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = verifyToken(auth) as { userId: string };
  const { walletId, tokenAddress, amountEth, slippage } = await req.json();

  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const result = await buyToken({
    walletId,
    encryptedKey: wallet.encryptedKey,
    tokenAddress,
    amountEth,
    slippage: slippage || "0.5",
  });

  return NextResponse.json(result);
}
