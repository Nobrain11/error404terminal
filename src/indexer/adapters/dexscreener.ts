import type { IndexedToken, IndexedMarket, IndexedTrade, AdapterResult, Source } from "../types";

const BASE = "https://api.dexscreener.com";
const CHAIN = "robinhood";

// DexScreener is our primary data source for now.
// It already aggregates Uniswap V3 pairs on Robinhood Chain.
// We use it as the foundation while we build direct on-chain adapters.

function parseSource(dexId: string): Source {
  if (dexId?.includes("uniswap")) return "uniswap";
  if (dexId?.includes("pons")) return "pons";
  if (dexId?.includes("flap")) return "flap";
  if (dexId?.includes("noxa")) return "noxa";
  return "dexscreener";
}

function safeFloat(v: any): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function pairToToken(pair: any): IndexedToken {
  return {
    address: pair.baseToken?.address || "",
    name: pair.baseToken?.name || "Unknown",
    symbol: pair.baseToken?.symbol || "???",
    decimals: 18,
    source: parseSource(pair.dexId),
    poolAddress: pair.pairAddress,
    createdAt: pair.pairCreatedAt || Date.now(),
    imageUrl: pair.info?.imageUrl || "",
    website: pair.info?.websites?.[0]?.url || "",
    telegram: pair.info?.socials?.find((s: any) => s.type === "telegram")?.url || "",
    twitter: pair.info?.socials?.find((s: any) => s.type === "twitter")?.url || "",
  };
}

export function pairToMarket(pair: any): IndexedMarket {
  return {
    tokenAddress: pair.baseToken?.address || "",
    poolAddress: pair.pairAddress || "",
    priceUsd: safeFloat(pair.priceUsd),
    priceNative: safeFloat(pair.priceNative),
    liquidityUsd: safeFloat(pair.liquidity?.usd),
    volumeUsd24h: safeFloat(pair.volume?.h24),
    volumeUsd1h: safeFloat(pair.volume?.h1),
    volumeUsd5m: safeFloat(pair.volume?.m5),
    buys24h: pair.txns?.h24?.buys || 0,
    sells24h: pair.txns?.h24?.sells || 0,
    priceChange5m: safeFloat(pair.priceChange?.m5),
    priceChange1h: safeFloat(pair.priceChange?.h1),
    priceChange6h: safeFloat(pair.priceChange?.h6),
    priceChange24h: safeFloat(pair.priceChange?.h24),
    marketCap: safeFloat(pair.marketCap || pair.fdv),
    fdv: safeFloat(pair.fdv),
    source: parseSource(pair.dexId),
    updatedAt: Date.now(),
  };
}

export async function fetchByQuery(query: string): Promise<AdapterResult> {
  try {
    const res = await fetch(
      `${BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
      { next: { revalidate: 15 } }
    );
    const data = await res.json();
    const pairs = (data.pairs || []).filter((p: any) => p.chainId === CHAIN);

    return {
      tokens: pairs.map(pairToToken).filter((t: IndexedToken) => t.address),
      markets: pairs.map(pairToMarket).filter((m: IndexedMarket) => m.tokenAddress),
      trades: [],
      launches: [],
    };
  } catch {
    return { tokens: [], markets: [], trades: [], launches: [] };
  }
}

export async function fetchByAddress(ca: string): Promise<AdapterResult> {
  try {
    const res = await fetch(`${BASE}/latest/dex/tokens/${ca}`);
    const data = await res.json();
    const pairs = (data.pairs || []).filter((p: any) => p.chainId === CHAIN);
    const pair = pairs[0];
    if (!pair) return { tokens: [], markets: [], trades: [], launches: [] };

    return {
      tokens: [pairToToken(pair)],
      markets: [pairToMarket(pair)],
      trades: [],
      launches: [],
    };
  } catch {
    return { tokens: [], markets: [], trades: [], launches: [] };
  }
}

// Fetch trending by combining multiple relevant queries
export async function fetchTrending(): Promise<AdapterResult> {
  const queries = [
    "WETH", "ETH", "CAT", "PEPE", "DOGE",
    "PONS", "FLAP", "HOOD", "ROBIN", "AI",
    "MEME", "FUN", "BASED", "INU", "COIN",
  ];

  const results = await Promise.allSettled(
    queries.map((q) => fetchByQuery(q))
  );

  const seen = new Set<string>();
  const tokens: IndexedToken[] = [];
  const markets: IndexedMarket[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const token of result.value.tokens) {
        if (token.address && !seen.has(token.address)) {
          seen.add(token.address);
          tokens.push(token);
          const market = result.value.markets.find(
            (m) => m.tokenAddress === token.address
          );
          if (market) markets.push(market);
        }
      }
    }
  }

  return { tokens, markets, trades: [], launches: [] };
}
