// src/app/api/wallet/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateCustodialWallet } from "@/lib/wallet/custodial";
import { getUserFromBearerToken } from "@/lib/auth/session";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getUserFromBearerToken(req.headers.get("authorization"));
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let name = "Wallet 1";
  try {
    const body = await req.json();
    if (body?.name && typeof body.name === "string") name = body.name;
  } catch {
    // no body sent — fine, keep default name
  }

  try {
    const existingCount = await prisma.wallet.count({ where: { userId: session.userId } });
    const { address, privateKey, encryptedPrivateKey } = generateCustodialWallet();

    await prisma.wallet.create({
      data: {
        userId: session.userId,
        name,
        address,
        encryptedKey: encryptedPrivateKey,
        isDefault: existingCount === 0, // first wallet becomes default automatically
      },
    });

    // privateKey is returned exactly once, over HTTPS, to the user who just
    // created it. It is never stored in plaintext and never returned again.
    return NextResponse.json({ address, privateKey });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Address collision — try again." }, { status: 500 });
    }
    console.error("Wallet creation failed:", err); // safe — no key material logged
    return NextResponse.json({ error: "Could not create wallet." }, { status: 500 });
  }
}
