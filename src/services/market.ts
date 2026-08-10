import axios from "axios";

const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex";
const CHAIN = "robinhood";

export async function getTrendingTokens() {
  try {
    const { data } = await axios.get(
      `${DEXSCREENER_API}/tokens/${CHAIN}`
    );
    return data.pairs || [];
  } catch {
    return [];
  }
}

export async function getTokenByAddress(ca: string) {
  try {
    const { data } = await axios.get(
      `${DEXSCREENER_API}/tokens/${ca}`
    );
    const pair = data.pairs?.find(
      (p: any) => p.chainId === CHAIN
    ) || data.pairs?.[0];
    return pair || null;
  } catch {
    return null;
  }
}

export async function searchTokens(query: string) {
  try {
    const { data } = await axios.get(
      `${DEXSCREENER_API}/search?q=${encodeURIComponent(query)}`
    );
    return data.pairs?.filter((p: any) => p.chainId === CHAIN) || [];
  } catch {
    return [];
  }
}

export async function getTopTokens() {
  try {
    const { data } = await axios.get(
      `https://api.dexscreener.com/token-boosts/top/v1`
    );
    return data || [];
  } catch {
    return [];
  }
}

export function formatPair(pair: any) {
  return {
    ca: pair.baseToken?.address || "",
    name: pair.baseToken?.name || "Unknown",
    ticker: pair.baseToken?.symbol || "???",
    price: parseFloat(pair.priceUsd || "0"),
    change: pair.priceChange?.h24 || 0,
    mcap: pair.marketCap
      ? formatNum(pair.marketCap)
      : pair.fdv
      ? formatNum(pair.fdv)
      : "N/A",
    liq: pair.liquidity?.usd
      ? formatNum(pair.liquidity.usd)
      : "N/A",
    vol: pair.volume?.h24
      ? formatNum(pair.volume.h24)
      : "N/A",
    age: pair.pairCreatedAt
      ? getAge(pair.pairCreatedAt)
      : "N/A",
    holders: 0,
    verified: false,
    logo: "",
    pairAddress: pair.pairAddress || "",
    dexId: pair.dexId || "",
    url: pair.url || "",
  };
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n.toFixed(2)}`;
}

function getAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}
