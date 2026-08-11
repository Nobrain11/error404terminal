import { NextRequest, NextResponse } from "next/server";
import { sellToken, getTokenBalance } from "@/services/trading";
import { decrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const { encryptedKey, walletAddress, tokenAddress, percentage, slippage } = await req.json();

    if (!encryptedKey || !tokenAddress || !percentage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const privateKey = decrypt(encryptedKey);
    const { raw, decimals } = await getTokenBalance(tokenAddress, walletAddress);
    const amountToSell = raw * BigInt(Math.floor(percentage)) / 100n;

    if (amountToSell === 0n) {
      return NextResponse.json({ error: "No token balance" }, { status: 400 });
    }

    const result = await sellToken({
      privateKey,
      tokenAddress,
      amountTokenWei: amountToSell.toString(),
      slippagePct: parseFloat(slippage || "0.5"),
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
