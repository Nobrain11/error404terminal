import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC = "https://robinhood-rpc.publicnode.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const balance = await provider.getBalance(address);
    const ethBalance = ethers.formatEther(balance);

    // Get ETH price in USD from DexScreener
    let ethPrice = 0;
    try {
      const res = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
      );
      const data = await res.json();
      ethPrice = parseFloat(data.pairs?.[0]?.priceUsd || "0");
    } catch {}

    return NextResponse.json({
      address,
      balance: ethBalance,
      balanceUsd: (parseFloat(ethBalance) * ethPrice).toFixed(2),
      ethPrice: ethPrice.toFixed(2),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}
