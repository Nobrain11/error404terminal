// src/app/api/auth/wallet-connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ethers } from "ethers";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { address, signature, message, nonce } = await req.json();

  if (!address || !signature || !message || !nonce) {
    return NextResponse.json({ error: "Missing address, signature, message, or nonce." }, { status: 400 });
  }

  // Validate the nonce was actually issued by us, unused, and not expired
  const nonceRecord = await prisma.walletNonce.findUnique({ where: { nonce } });
  if (!nonceRecord || nonceRecord.used || nonceRecord.expiresAt < new Date()) {
    return NextResponse.json({ error: "Sign-in request expired or invalid. Try again." }, { status: 401 });
  }
  if (nonceRecord.address !== address.toLowerCase()) {
    return NextResponse.json({ error: "Address mismatch." }, { status: 401 });
  }

  // Verify the signature actually proves ownership of the address
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(message, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Signature does not match address." }, { status: 401 });
  }

  // Burn the nonce so it can't be replayed
  await prisma.walletNonce.update({ where: { nonce }, data: { used: true } });

  // Find or create the user tied to this wallet address
  let wallet = await prisma.wallet.findUnique({ where: { address } });
  let userId: string;

  if (wallet) {
    userId = wallet.userId;
  } else {
    const user = await prisma.user.create({ data: {} }); // no telegramId — wallet-based account
    userId = user.id;
    wallet = await prisma.wallet.create({
      data: {
        userId,
        name: "Wallet 1",
        address,
        isDefault: true,
        // encryptedKey intentionally omitted — this is a connected (non-custodial) wallet, we never hold the key
      },
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await prisma.session.create({ data: { userId, token, expiresAt } });

  return NextResponse.json({
    token,
    user: { id: userId },
    wallet: { address: wallet.address, name: wallet.name },
  });
}
