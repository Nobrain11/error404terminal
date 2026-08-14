// src/app/api/wallet/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateCustodialWallet } from "@/lib/wallet/custodial";
import { getUserFromBearerToken } from "@/lib/auth/session";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // ─────────────────────────────────────────────────────────────────────────
  // Authentication
  // ─────────────────────────────────────────────────────────────────────────

  const session = await getUserFromBearerToken(
    req.headers.get("authorization"),
  );

  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Wallet name
  // ─────────────────────────────────────────────────────────────────────────

  let name = "Wallet 1";

  try {
    const body = await req.json();

    if (
      body &&
      typeof body.name === "string" &&
      body.name.trim().length > 0
    ) {
      name = body.name.trim().slice(0, 64);
    }
  } catch {
    // Empty/non-JSON body is completely valid.
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate wallet FIRST.
  //
  // This is deliberately before the database queries.
  //
  // A database/schema problem must never prevent ethers from generating the
  // wallet itself.
  // ─────────────────────────────────────────────────────────────────────────

  let generated: {
    address: string;
    privateKey: string;
    encryptedPrivateKey: string;
  };

  try {
    generated = generateCustodialWallet();
  } catch (err) {
    console.error("Custodial wallet generation failed:", err);

    return NextResponse.json(
      {
        error: "Could not generate wallet.",
      },
      { status: 500 },
    );
  }

  const {
    address,
    privateKey,
    encryptedPrivateKey,
  } = generated;

  // ─────────────────────────────────────────────────────────────────────────
  // Determine whether this is the user's first wallet.
  //
  // If the database is temporarily unavailable or the schema is behind,
  // default to false rather than preventing wallet generation.
  // ─────────────────────────────────────────────────────────────────────────

  let isDefault = false;

  try {
    const existingCount =
      await prisma.wallet.count({
        where: {
          userId: session.userId,
        },
      });

    isDefault = existingCount === 0;
  } catch (err: any) {
    console.error(
      "Could not determine wallet count:",
      err?.code || err?.message || err,
    );

    // We deliberately continue.
    //
    // The wallet itself has already been generated.
    // The database schema issue should not block the wallet-generation path.
    isDefault = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Persist encrypted wallet.
  //
  // NOTE:
  // The private key is NEVER written to PostgreSQL in plaintext.
  // ─────────────────────────────────────────────────────────────────────────

  try {
    await prisma.wallet.create({
      data: {
        userId: session.userId,
        name,
        address,
        encryptedKey: encryptedPrivateKey,
        isDefault,
      },
    });

    // Return the private key exactly once.
    return NextResponse.json({
      success: true,
      address,
      privateKey,
    });
  } catch (err: any) {
    // Unique address collision.
    if (err?.code === "P2002") {
      console.error(
        "Wallet address collision during creation.",
      );

      return NextResponse.json(
        {
          error: "Address collision — please try again.",
        },
        { status: 409 },
      );
    }

    // Prisma P2022 = database column/schema mismatch.
    //
    // We explicitly recognize it so the logs make the real problem obvious.
    if (err?.code === "P2022") {
      console.error(
        "Wallet database schema is behind Prisma schema. " +
          "Wallet.name is missing from production database.",
      );

      return NextResponse.json(
        {
          error:
            "Wallet generated, but database schema needs to be updated.",
          code: "DATABASE_SCHEMA_OUTDATED",
          address,
          privateKey,
          persisted: false,
        },
        { status: 503 },
      );
    }

    console.error(
      "Wallet persistence failed:",
      err?.code || err?.message || err,
    );

    return NextResponse.json(
      {
        error:
          "Wallet was generated but could not be saved. " +
          "Do not close this screen until the wallet has been backed up.",
        code: "WALLET_NOT_PERSISTED",
        address,
        privateKey,
        persisted: false,
      },
      { status: 503 },
    );
  }
}
