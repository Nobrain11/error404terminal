import { NextRequest, NextResponse } from "next/server";
import { getTrendingTokens, searchTokens, getTokenByAddress, formatPair } from "@/services/market";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const ca = searchParams.get("ca");

  try {
    if (ca) {
      const pair = await getTokenByAddress(ca);
      if (!pair) return NextResponse.json({ error: "Token not found" }, { status: 404 });
      return NextResponse.json(formatPair(pair));
    }

    if (q) {
      const pairs = await searchTokens(q);
      return NextResponse.json(pairs.slice(0, 20).map(formatPair));
    }

    const pairs = await getTrendingTokens();
    return NextResponse.json(pairs.slice(0, 50).map(formatPair));
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
