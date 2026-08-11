import { NextRequest, NextResponse } from "next/server";
import { buyToken, getQuote } from "@/services/trading";
import { decrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const { encryptedKey, tokenAddress, amountEth, slippage } = await req.json();

    if (!encryptedKey || !tokenAddress || !amountEth) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const privateKey = decrypt(encryptedKey);

    const result = await buyToken({
      privateKey,
      tokenAddress,
      amountEth,
      slippagePct: parseFloat(slippage || "0.5"),
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
