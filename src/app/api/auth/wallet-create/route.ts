// src/app/api/auth/wallet-create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { generateCustodialWallet } from "@/lib/wallet/custodial";

const prisma = new PrismaClient();

export async function POST(_req: NextRequest) {
  try {
    const user = await prisma.user.create({ data: {} });
    const { address, privateKey, encryptedPrivateKey } = generateCustodialWallet();

    await prisma.wallet.create({
      data: {
        userId: user.id,
        name: "Wallet 1",
        address,
        encryptedKey: encryptedPrivateKey,
        isDefault: true,
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({ data: { userId: user.id, token, expiresAt } });

    // privateKey returned ONCE — this response is the only chance to back it up
    return NextResponse.json({ token, user: { id: user.id }, address, privateKey });
  } catch (err) {
    console.error("Wallet signup failed:", err);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
