import { NextRequest, NextResponse } from "next/server";
import { getBuyQuote, getEthBalance, getTokenBalance } from "@/services/trading";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const amount = searchParams.get("amount");
  const wallet = searchParams.get("wallet");

  if (!token || !amount) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const [quote, ethBalance, tokenBalance] = await Promise.all([
      getBuyQuote(token, amount),
      wallet ? getEthBalance(wallet) : Promise.resolve("0"),
      wallet ? getTokenBalance(token, wallet) : Promise.resolve({ formatted: "0", raw: 0n, decimals: 18 }),
    ]);

    return NextResponse.json({
      quote,
      ethBalance,
      tokenBalance: tokenBalance.formatted,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
