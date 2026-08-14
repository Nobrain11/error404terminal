import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  importFromPhrase,
  importFromKey,
} from "@/lib/wallet";
import { verifyToken } from "@/lib/jwt";

export const dynamic = "force-dynamic";

function getBearerToken(req: NextRequest) {
  const header =
    req.headers.get("authorization");

  if (!header) return null;

  const [scheme, token] =
    header.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

export async function POST(
  req: NextRequest,
) {
  // ──────────────────────────────────────────
  // Authentication
  // ──────────────────────────────────────────

  const token =
    getBearerToken(req);

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let userId: string;

  try {
    const payload =
      verifyToken(token) as {
        userId?: string;
      };

    if (!payload?.userId) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 },
      );
    }

    userId = payload.userId;
  } catch {
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 },
    );
  }

  // ──────────────────────────────────────────
  // Input
  // ──────────────────────────────────────────

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const type =
    body?.type === "phrase"
      ? "phrase"
      : "key";

  const value =
    typeof body?.value === "string"
      ? body.value.trim()
      : "";

  let name =
    typeof body?.name === "string" &&
    body.name.trim()
      ? body.name.trim().slice(0, 64)
      : "Imported Wallet";

  if (!value) {
    return NextResponse.json(
      {
        error:
          type === "phrase"
            ? "Recovery phrase is required."
            : "Private key is required.",
      },
      { status: 400 },
    );
  }

  // ──────────────────────────────────────────
  // Validate with ethers
  // ──────────────────────────────────────────

  let walletData: {
    address: string;
    encryptedKey: string;
    encryptedPhrase: string | null;
  };

  try {
    walletData =
      type === "phrase"
        ? importFromPhrase(value)
        : importFromKey(value);
  } catch {
    return NextResponse.json(
      {
        error:
          type === "phrase"
            ? "Invalid recovery phrase."
            : "Invalid private key.",
      },
      { status: 400 },
    );
  }

  // ──────────────────────────────────────────
  // Check duplicate
  // ──────────────────────────────────────────

  try {
    const existing =
      await prisma.wallet.findUnique({
        where: {
          address: walletData.address,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "This wallet is already imported.",
          address:
            walletData.address,
        },
        { status: 409 },
      );
    }
  } catch (error: any) {
    // P2022 means production DB schema is behind.
    // Do not block validation/import because of that.
    if (error?.code !== "P2022") {
      console.error(
        "Wallet duplicate check failed:",
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }

  // ──────────────────────────────────────────
  // Persist encrypted wallet
  // ──────────────────────────────────────────

  try {
    const existingCount =
      await prisma.wallet.count({
        where: {
          userId,
        },
      });

    const wallet =
      await prisma.wallet.create({
        data: {
          userId,
          name,
          address:
            walletData.address,
          encryptedKey:
            walletData.encryptedKey,
          encryptedPhrase:
            walletData.encryptedPhrase,
          isDefault:
            existingCount === 0,
        },
      });

    return NextResponse.json({
      success: true,
      persisted: true,
      id: wallet.id,
      address:
        wallet.address,
      name: wallet.name,
    });
  } catch (error: any) {
    // Production currently has this exact problem.
    if (error?.code === "P2022") {
      console.error(
        "Wallet import generated a valid wallet but database schema is outdated.",
      );

      return NextResponse.json(
        {
          success: true,
          persisted: false,
          requiresDatabaseRepair: true,
          address:
            walletData.address,
          name,
          warning:
            "Wallet validated successfully, but it could not be saved because the database schema needs updating.",
        },
        { status: 200 },
      );
    }

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "This wallet is already imported.",
        },
        { status: 409 },
      );
    }

    console.error(
      "Wallet import persistence failed:",
      error instanceof Error
        ? error.message
        : error,
    );

    return NextResponse.json(
      {
        success: true,
        persisted: false,
        address:
          walletData.address,
        name,
        warning:
          "Wallet validated, but database storage failed.",
      },
      { status: 200 },
    );
  }
}
