// src/app/api/auth/wallet-import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ethers } from "ethers";
import crypto from "crypto";
import { encryptPrivateKey } from "@/lib/wallet/custodial";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { input } = await req.json(); // private key OR 12/24-word phrase, raw text
  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "Private key or recovery phrase required." }, { status: 400 });
  }

  const trimmed = input.trim();
  let derived: { address: string; privateKey: string } | null = null;
  let phraseToStore: string | null = null;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 12 || words.length === 24) {
    try {
      const w = ethers.Wallet.fromPhrase(trimmed);
      derived = { address: w.address, privateKey: w.privateKey };
      phraseToStore = trimmed;
    } catch {
      return NextResponse.json({ error: "Invalid recovery phrase." }, { status: 400 });
    }
  } else {
    try {
      const w = new ethers.Wallet(trimmed);
      derived = { address: w.address, privateKey: w.privateKey };
    } catch {
      return NextResponse.json({ error: "Invalid private key." }, { status: 400 });
    }
  }

  try {
    let wallet = await prisma.wallet.findUnique({ where: { address: derived.address } });
    let userId: string;

    if (wallet) {
      // Wallet already registered — this is a login
      userId = wallet.userId;
    } else {
      // New wallet — this is a signup
      const user = await prisma.user.create({ data: {} });
      userId = user.id;
      wallet = await prisma.wallet.create({
        data: {
          userId,
          name: "Wallet 1",
          address: derived.address,
          encryptedKey: encryptPrivateKey(derived.privateKey),
          encryptedPhrase: phraseToStore ? encryptPrivateKey(phraseToStore) : null,
          isDefault: true,
        },
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({ data: { userId, token, expiresAt } });

    return NextResponse.json({
      token,
      user: { id: userId },
      wallet: { address: wallet.address, name: wallet.name },
    });
  } catch (err) {
    console.error("Wallet import failed:", err); // safe — no key material logged
    return NextResponse.json({ error: "Could not import wallet." }, { status: 500 });
  }
}
