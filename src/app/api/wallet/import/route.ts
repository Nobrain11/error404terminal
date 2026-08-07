import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importFromPhrase, importFromKey } from "@/lib/wallet";
import { verifyToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")?.split(" ")[1];
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = verifyToken(auth) as { userId: string };
  const { type, value, name } = await req.json();

  const walletData = type === "phrase"
    ? importFromPhrase(value)
    : importFromKey(value);

  const existing = await prisma.wallet.findUnique({ where: { address: walletData.address } });
  if (existing) return NextResponse.json({ error: "Wallet already imported" }, { status: 409 });

  const wallet = await prisma.wallet.create({
    data: { userId, name: name || "Imported Wallet", ...walletData },
  });

  return NextResponse.json({ address: wallet.address, id: wallet.id });
}
