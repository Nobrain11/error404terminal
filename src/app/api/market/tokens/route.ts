import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const CHAIN = "robinhood";
const BASE = "https://api.dexscreener.com";

function formatNum(n: number): string {
  if (!n || isNaN(n)) return "N/A";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n.toFixed(2)}`;
}

function getAge(ts: number): string {
  if (!ts) return "N/A";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function formatPair(pair: any) {
  return {
    ca: pair.baseToken?.address || "",
    name: pair.baseToken?.name || "Unknown",
    ticker: pair.baseToken?.symbol || "???",
    price: parseFloat(pair.priceUsd || "0"),
    change: parseFloat(pair.priceChange?.h24 || "0"),
    mcap: pair.marketCap
      ? formatNum(pair.marketCap)
      : pair.fdv
      ? formatNum(pair.fdv)
      : "N/A",
    liq: pair.liquidity?.usd ? formatNum(pair.liquidity.usd) : "N/A",
    vol: pair.volume?.h24 ? formatNum(pair.volume.h24) : "N/A",
    age: pair.pairCreatedAt ? getAge(pair.pairCreatedAt) : "N/A",
    holders: 0,
    verified: false,
    logo: pair.info?.imageUrl || "",
    pairAddress: pair.pairAddress || "",
    dexId: pair.dexId || "",
    url: pair.url || `https://dexscreener.com/robinhood/${pair.pairAddress}`,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const ca = searchParams.get("ca");

  try {
    if (ca) {
      const { data } = await axios.get(
        `${BASE}/latest/dex/tokens/${ca}`,
        { timeout: 10000 }
      );
      const pair = data.pairs?.find((p: any) => p.chainId === CHAIN)
        || data.pairs?.[0];
      if (!pair) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(formatPair(pair));
    }

    if (q) {
      const { data } = await axios.get(
        `${BASE}/latest/dex/search?q=${encodeURIComponent(q)}`,
        { timeout: 10000 }
      );
      const pairs = (data.pairs || [])
        .filter((p: any) => p.chainId === CHAIN)
        .slice(0, 30)
        .map(formatPair);
      return NextResponse.json(pairs);
    }

    // Fetch trending using multiple terms
    const queries = [
      "CASHCAT", "WETH", "TROLL", "PEPE", "CAT",
      "DOGE", "AI", "BOT", "BASED", "ROBIN",
    ];

    const results = await Promise.allSettled(
      queries.map(term =>
        axios.get(`${BASE}/latest/dex/search?q=${term}`, { timeout: 8000 })
      )
    );

    const seen = new Set<string>();
    const pairs: any[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        const filtered = (result.value.data.pairs || [])
          .filter((p: any) => p.chainId === CHAIN);
        for (const pair of filtered) {
          const key = pair.pairAddress;
          if (key && !seen.has(key)) {
            seen.add(key);
            pairs.push(formatPair(pair));
          }
        }
      }
    }

    // Sort by 24h volume descending
    pairs.sort((a, b) => {
      const aV = parseFloat(a.vol?.replace(/[^0-9.]/g, "") || "0");
      const bV = parseFloat(b.vol?.replace(/[^0-9.]/g, "") || "0");
      return bV - aV;
    });

    return NextResponse.json(pairs.slice(0, 60));
  } catch (err) {
    console.error("Market API error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
