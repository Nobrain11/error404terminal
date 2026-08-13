// src/app/api/auth/nonce/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { ethers } from "ethers";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !ethers.isAddress(address)) {
    return NextResponse.json({ error: "Valid wallet address required." }, { status: 400 });
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  await prisma.walletNonce.create({
    data: { address: address.toLowerCase(), nonce, expiresAt },
  });

  const message =
    `Sign in to ERROR404 Terminal\n\n` +
    `Address: ${address}\n` +
    `Nonce: ${nonce}\n` +
    `Expires: ${expiresAt.toISOString()}`;

  return NextResponse.json({ message, nonce });
}
