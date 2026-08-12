import { NextRequest, NextResponse } from "next/server";

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
  if (mins > 0) return `${mins}m`;
  return "new";
}

function formatPair(pair: any) {
  return {
    ca: pair.baseToken?.address || "",
    name: pair.baseToken?.name || "Unknown",
    ticker: pair.baseToken?.symbol || "???",
    price: parseFloat(pair.priceUsd || "0"),
    priceFormatted: formatPrice(parseFloat(pair.priceUsd || "0")),
    change5m: parseFloat(pair.priceChange?.m5 || "0"),
    change1h: parseFloat(pair.priceChange?.h1 || "0"),
    change6h: parseFloat(pair.priceChange?.h6 || "0"),
    change24h: parseFloat(pair.priceChange?.h24 || "0"),
    mcap: pair.marketCap || pair.fdv || 0,
    mcapFormatted: formatNum(pair.marketCap || pair.fdv || 0),
    liq: pair.liquidity?.usd || 0,
    liqFormatted: formatNum(pair.liquidity?.usd || 0),
    vol24h: pair.volume?.h24 || 0,
    vol1h: pair.volume?.h1 || 0,
    volFormatted: formatNum(pair.volume?.h24 || 0),
    buys24h: pair.txns?.h24?.buys || 0,
    sells24h: pair.txns?.h24?.sells || 0,
    age: getAge(pair.pairCreatedAt),
    ageMs: pair.pairCreatedAt || 0,
    source: pair.dexId || "unknown",
    imageUrl: pair.info?.imageUrl || "",
    website: pair.info?.websites?.[0]?.url || "",
    telegram: pair.info?.socials?.find((s: any) => s.type === "telegram")?.url || "",
    twitter: pair.info?.socials?.find((s: any) => s.type === "twitter")?.url || "",
    pairAddress: pair.pairAddress || "",
    dexId: pair.dexId || "",
    dexUrl: pair.url || `https://dexscreener.com/robinhood/${pair.pairAddress}`,
    trendingScore: 0,
  };
}

function formatPrice(p: number): string {
  if (!p || isNaN(p)) return "$0";
  if (p < 0.000001) return `$${p.toExponential(2)}`;
  if (p < 0.001) return `$${p.toFixed(8)}`;
  if (p < 1) return `$${p.toFixed(6)}`;
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${p.toFixed(4)}`;
}

async function dexSearch(query: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
      {
        headers: { "Accept": "application/json" },
        next: { revalidate: 15 },
      }
    );
    const data = await res.json();
    return (data.pairs || []).filter((p: any) => p.chainId === CHAIN);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const ca = searchParams.get("ca");
  const sort = searchParams.get("sort") || "trending";

  try {
    // Single token by CA
    if (ca) {
      const res = await fetch(`${BASE}/latest/dex/tokens/${ca}`);
      const data = await res.json();
      const pair = (data.pairs || []).find((p: any) => p.chainId === CHAIN)
        || data.pairs?.[0];
      if (!pair) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(formatPair(pair));
    }

    // Search
    if (q) {
      const pairs = await dexSearch(q);
      return NextResponse.json(pairs.slice(0, 30).map(formatPair));
    }

    // Trending — fetch multiple queries in parallel
    const QUERIES = [
      "CASHCAT", "PONS", "WETH", "FLAP",
      "CAT", "PEPE", "DOGE", "HOOD",
      "ROBIN", "MEME", "AI", "BASED",
      "INU", "FUN", "MOON",
    ];

    const results = await Promise.allSettled(
      QUERIES.map((q) => dexSearch(q))
    );

    const seen = new Set<string>();
    const pairs: any[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const pair of result.value) {
          const key = pair.pairAddress;
          if (key && !seen.has(key)) {
            seen.add(key);
            pairs.push(pair);
          }
        }
      }
    }

    // Sort based on requested sort
    let sorted = [...pairs];
    if (sort === "new") {
      sorted.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
    } else if (sort === "volume") {
      sorted.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
    } else if (sort === "gainers") {
      sorted.sort((a, b) => (parseFloat(b.priceChange?.h24 || "0")) - (parseFloat(a.priceChange?.h24 || "0")));
    } else if (sort === "losers") {
      sorted.sort((a, b) => (parseFloat(a.priceChange?.h24 || "0")) - (parseFloat(b.priceChange?.h24 || "0")));
    } else {
      // trending — score by volume + buys + recency
      sorted.sort((a, b) => {
        const scoreA = (a.volume?.h24 || 0) + (a.txns?.h24?.buys || 0) * 100;
        const scoreB = (b.volume?.h24 || 0) + (b.txns?.h24?.buys || 0) * 100;
        return scoreB - scoreA;
      });
    }

    return NextResponse.json(
      sorted
        .filter((p) => (p.liquidity?.usd || 0) > 500)
        .slice(0, 60)
        .map(formatPair)
    );
  } catch (err) {
    console.error("Market API error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
