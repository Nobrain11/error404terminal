import { NextRequest, NextResponse } from "next/server";
import {
  getTrending,
  getNewTokens,
  getTopVolume,
  getTopGainers,
  getTopLosers,
  searchTokens,
  getTokenByAddress,
} from "@/indexer/market";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const ca = searchParams.get("ca");
  const sort = searchParams.get("sort") || "trending";
  const period = (searchParams.get("period") || "24h") as "5m"|"1h"|"6h"|"24h";

  try {
    if (ca) {
      const token = await getTokenByAddress(ca);
      if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(token);
    }

    if (q) {
      const tokens = await searchTokens(q);
      return NextResponse.json(tokens);
    }

    let tokens;
    switch (sort) {
      case "new":     tokens = await getNewTokens(); break;
      case "volume":  tokens = await getTopVolume(); break;
      case "gainers": tokens = await getTopGainers(period); break;
      case "losers":  tokens = await getTopLosers(period); break;
      default:        tokens = await getTrending(); break;
    }

    return NextResponse.json(tokens);
  } catch (err) {
    console.error("Market API error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
