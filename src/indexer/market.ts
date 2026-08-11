import { fetchTrending, fetchByQuery, fetchByAddress, pairToToken, pairToMarket } from "./adapters/dexscreener";
import { calcTrendingScore, type IndexedMarket, type IndexedToken } from "./types";

export interface UnifiedToken {
  ca: string;
  name: string;
  ticker: string;
  price: number;
  priceFormatted: string;
  change5m: number;
  change1h: number;
  change6h: number;
  change24h: number;
  mcap: number;
  mcapFormatted: string;
  liq: number;
  liqFormatted: string;
  vol24h: number;
  volFormatted: string;
  vol1h: number;
  buys24h: number;
  sells24h: number;
  age: string;
  ageMs: number;
  source: string;
  imageUrl: string;
  website: string;
  telegram: string;
  twitter: string;
  pairAddress: string;
  dexUrl: string;
  trendingScore: number;
}

function fmtNum(n: number): string {
  if (!n || isNaN(n)) return "N/A";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n.toFixed(2)}`;
}

function fmtPrice(p: number): string {
  if (!p || isNaN(p)) return "$0";
  if (p < 0.000001) return `$${p.toExponential(2)}`;
  if (p < 0.001) return `$${p.toFixed(8)}`;
  if (p < 1) return `$${p.toFixed(6)}`;
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${p.toFixed(4)}`;
}

function fmtAge(ms: number): string {
  if (!ms) return "N/A";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return "new";
}

function toUnified(token: IndexedToken, market: IndexedMarket): UnifiedToken {
  const ageMs = token.createdAt || 0;
  const ageHours = (Date.now() - ageMs) / 3600000;
  const score = calcTrendingScore(market, ageHours);

  return {
    ca: token.address,
    name: token.name,
    ticker: token.symbol,
    price: market.priceUsd,
    priceFormatted: fmtPrice(market.priceUsd),
    change5m: market.priceChange5m,
    change1h: market.priceChange1h,
    change6h: market.priceChange6h,
    change24h: market.priceChange24h,
    mcap: market.marketCap,
    mcapFormatted: fmtNum(market.marketCap),
    liq: market.liquidityUsd,
    liqFormatted: fmtNum(market.liquidityUsd),
    vol24h: market.volumeUsd24h,
    volFormatted: fmtNum(market.volumeUsd24h),
    vol1h: market.volumeUsd1h,
    buys24h: market.buys24h,
    sells24h: market.sells24h,
    age: fmtAge(ageMs),
    ageMs,
    source: token.source,
    imageUrl: token.imageUrl || "",
    website: token.website || "",
    telegram: token.telegram || "",
    twitter: token.twitter || "",
    pairAddress: market.poolAddress,
    dexUrl: `https://dexscreener.com/robinhood/${market.poolAddress}`,
    trendingScore: score,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getTrending(): Promise<UnifiedToken[]> {
  const { tokens, markets } = await fetchTrending();
  const unified: UnifiedToken[] = [];

  for (const token of tokens) {
    const market = markets.find((m) => m.tokenAddress === token.address);
    if (market && token.address) {
      unified.push(toUnified(token, market));
    }
  }

  return unified
    .filter((t) => t.liq > 1000) // filter dust
    .sort((a, b) => b.trendingScore - a.trendingScore);
}

export async function getNewTokens(): Promise<UnifiedToken[]> {
  const all = await getTrending();
  return [...all].sort((a, b) => b.ageMs - a.ageMs).slice(0, 50);
}

export async function getTopVolume(): Promise<UnifiedToken[]> {
  const all = await getTrending();
  return [...all].sort((a, b) => b.vol24h - a.vol24h).slice(0, 50);
}

export async function getTopGainers(period: "5m"|"1h"|"6h"|"24h" = "24h"): Promise<UnifiedToken[]> {
  const all = await getTrending();
  const key = period === "5m" ? "change5m" : period === "1h" ? "change1h" : period === "6h" ? "change6h" : "change24h";
  return [...all].sort((a, b) => (b[key] as number) - (a[key] as number)).slice(0, 50);
}

export async function getTopLosers(period: "5m"|"1h"|"6h"|"24h" = "24h"): Promise<UnifiedToken[]> {
  const all = await getTrending();
  const key = period === "5m" ? "change5m" : period === "1h" ? "change1h" : period === "6h" ? "change6h" : "change24h";
  return [...all].sort((a, b) => (a[key] as number) - (b[key] as number)).slice(0, 50);
}

export async function searchTokens(query: string): Promise<UnifiedToken[]> {
  const { tokens, markets } = await fetchByQuery(query);
  const unified: UnifiedToken[] = [];
  for (const token of tokens) {
    const market = markets.find((m) => m.tokenAddress === token.address);
    if (market && token.address) unified.push(toUnified(token, market));
  }
  return unified;
}

export async function getTokenByAddress(ca: string): Promise<UnifiedToken | null> {
  const { tokens, markets } = await fetchByAddress(ca);
  const token = tokens[0];
  const market = markets[0];
  if (!token || !market) return null;
  return toUnified(token, market);
}
