import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCustodialWallet } from "@/lib/wallet/custodial";
import { getUserFromBearerToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getUserFromBearerToken(
    req.headers.get("authorization"),
  );

  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  let name = "Wallet 1";

  try {
    const body = await req.json();

    if (
      typeof body?.name === "string" &&
      body.name.trim()
    ) {
      name = body.name.trim().slice(0, 64);
    }
  } catch {
    // Empty request body is allowed.
  }

  // Generate first. Database must never control whether ethers
  // can create a wallet.
  let generated: ReturnType<
    typeof generateCustodialWallet
  >;

  try {
    generated = generateCustodialWallet();
  } catch (error) {
    console.error(
      "Wallet generation failed:",
      error instanceof Error
        ? error.message
        : error,
    );

    return NextResponse.json(
      { error: "Could not generate wallet." },
      { status: 500 },
    );
  }

  const {
    address,
    privateKey,
    encryptedPrivateKey,
  } = generated;

  let isDefault = false;

  try {
    const count = await prisma.wallet.count({
      where: {
        userId: session.userId,
      },
    });

    isDefault = count === 0;
  } catch (error) {
    console.error(
      "Wallet count lookup failed:",
      error instanceof Error
        ? error.message
        : error,
    );

    // Continue. Generation itself succeeded.
  }

  try {
    const wallet = await prisma.wallet.create({
      data: {
        userId: session.userId,
        name,
        address,
        encryptedKey: encryptedPrivateKey,
        isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      persisted: true,
      id: wallet.id,
      address,
      privateKey,
      name: wallet.name,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Wallet address collision. Please try again.",
        },
        { status: 409 },
      );
    }

    if (error?.code === "P2022") {
      console.error(
        "Wallet schema is outdated: Wallet.name is missing.",
      );

      // Do NOT pretend the wallet was saved.
      // Give the user the newly generated wallet so it
      // is not silently lost.
      return NextResponse.json(
        {
          success: true,
          persisted: false,
          requiresDatabaseRepair: true,
          address,
          privateKey,
          name,
          warning:
            "Wallet generated successfully, but it could not be saved yet. Back up the private key before leaving this screen.",
        },
        { status: 200 },
      );
    }

    console.error(
      "Wallet persistence failed:",
      error instanceof Error
        ? error.message
        : error,
    );

    return NextResponse.json(
      {
        success: true,
        persisted: false,
        address,
        privateKey,
        name,
        warning:
          "Wallet generated, but database storage failed. Back up your private key before leaving.",
      },
      { status: 200 },
    );
  }
}
