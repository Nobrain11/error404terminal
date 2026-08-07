import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWallet } from "@/lib/wallet";
import { verifyToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")?.split(" ")[1];
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = verifyToken(auth) as { userId: string };
  const { name } = await req.json();
  const { address, encryptedKey, encryptedPhrase } = createWallet();

  const wallet = await prisma.wallet.create({
    data: { userId, name: name || "Wallet 1", address, encryptedKey, encryptedPhrase },
  });

  return NextResponse.json({ address: wallet.address, id: wallet.id });
}
