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

function formatPrice(p: number): string {
  if (!p || isNaN(p)) return "$0";
  if (p < 0.000001) return `$${p.toExponential(2)}`;
  if (p < 0.001) return `$${p.toFixed(8)}`;
  if (p < 1) return `$${p.toFixed(6)}`;
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${p.toFixed(4)}`;
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
  };
}

function trendingScore(pair: any): number {
  const vol24 = pair.volume?.h24 || 0;
  const vol1h = pair.volume?.h1 || 0;
  const buys24 = pair.txns?.h24?.buys || 0;
  const sells24 = pair.txns?.h24?.sells || 0;
  const change24 = parseFloat(pair.priceChange?.h24 || "0");
  const liq = pair.liquidity?.usd || 0;
  const ageHours = pair.pairCreatedAt
    ? (Date.now() - pair.pairCreatedAt) / 3600000
    : 9999;

  // Penalize tokens older than 30 days heavily
  const recency = Math.max(0, 200 - ageHours * 0.5);
  // Reward recent volume more
  const volScore = vol1h * 5 + vol24 * 0.3;
  // Reward buying pressure
  const buyScore = buys24 * 20;
  // Reward positive momentum
  const momentumScore = change24 > 0 ? change24 * 3 : 0;
  // Liquidity health
  const liqScore = Math.min(liq / 1000, 100);

  return volScore + buyScore + momentumScore + recency + liqScore;
}

async function dexSearch(query: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
      {
        headers: { "Accept": "application/json" },
        next: { revalidate: 20 },
      }
    );
    const data = await res.json();
    return (data.pairs || []).filter(
      (p: any) => p.chainId === CHAIN && (p.liquidity?.usd || 0) > 500
    );
  } catch {
    return [];
  }
}

// Use generic broad queries to get diverse results
// Avoid specific token names so one token doesn't dominate
const TRENDING_QUERIES = [
  "robinhood",
  "hood",
  "token",
  "coin",
  "swap",
  "fun",
  "inu",
  "ai",
  "pepe",
  "cat",
  "dog",
  "moon",
  "based",
  "meme",
  "flap",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const ca = searchParams.get("ca");
  const sort = searchParams.get("sort") || "trending";

  try {
    // Single token by CA
    if (ca) {
      const res = await fetch(
        `${BASE}/latest/dex/tokens/${ca}`,
        { headers: { "Accept": "application/json" } }
      );
      const data = await res.json();
      const pair = (data.pairs || []).find((p: any) => p.chainId === CHAIN)
        || data.pairs?.[0];
      if (!pair) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(formatPair(pair));
    }

    // Search by query
    if (q) {
      const pairs = await dexSearch(q);
      return NextResponse.json(pairs.slice(0, 30).map(formatPair));
    }

    // Fetch trending with broad queries
    const results = await Promise.allSettled(
      TRENDING_QUERIES.map((q) => dexSearch(q))
    );

    // Deduplicate by pair address
    const seen = new Set<string>();
    // Also track how many times each base token appears
    const tokenCount = new Map<string, number>();
    const pairs: any[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const pair of result.value) {
          const pairKey = pair.pairAddress;
          const tokenKey = pair.baseToken?.address?.toLowerCase();

          if (!pairKey || seen.has(pairKey)) continue;

          // Limit same token to max 1 pair (best liquidity one)
          const count = tokenCount.get(tokenKey) || 0;
          if (count >= 1) continue;

          seen.add(pairKey);
          tokenCount.set(tokenKey, count + 1);
          pairs.push(pair);
        }
      }
    }

    // Sort
    let sorted = [...pairs];

    if (sort === "new") {
      sorted.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));
    } else if (sort === "volume") {
      sorted.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
    } else if (sort === "gainers") {
      sorted.sort((a, b) =>
        parseFloat(b.priceChange?.h24 || "0") - parseFloat(a.priceChange?.h24 || "0")
      );
    } else if (sort === "losers") {
      sorted.sort((a, b) =>
        parseFloat(a.priceChange?.h24 || "0") - parseFloat(b.priceChange?.h24 || "0")
      );
    } else {
      // Trending — use scoring formula
      sorted.sort((a, b) => trendingScore(b) - trendingScore(a));
    }

    return NextResponse.json(sorted.slice(0, 60).map(formatPair));

  } catch (err) {
    console.error("Market API error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
