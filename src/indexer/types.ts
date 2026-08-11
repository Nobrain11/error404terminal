// ── Unified types for all launchpad/DEX adapters ──────────────────────────

export type Source = "uniswap" | "pons" | "flap" | "noxa" | "dexscreener" | "unknown";

export interface IndexedToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  source: Source;
  poolAddress?: string;
  creatorAddress?: string;
  createdAt: number; // unix ms
  graduatedAt?: number;
  imageUrl?: string;
  website?: string;
  telegram?: string;
  twitter?: string;
}

export interface IndexedPool {
  address: string;
  tokenAddress: string;
  baseTokenAddress: string; // WETH usually
  dex: string;
  source: Source;
  createdAt: number;
}

export interface IndexedMarket {
  tokenAddress: string;
  poolAddress: string;
  priceUsd: number;
  priceNative: number;
  liquidityUsd: number;
  volumeUsd24h: number;
  volumeUsd1h: number;
  volumeUsd5m: number;
  buys24h: number;
  sells24h: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  marketCap: number;
  fdv: number;
  source: Source;
  updatedAt: number;
}

export interface IndexedTrade {
  txHash: string;
  logIndex: number;
  tokenAddress: string;
  poolAddress: string;
  walletAddress: string;
  side: "buy" | "sell";
  amountToken: string; // bigint as string
  amountBase: string;  // ETH in wei as string
  priceUsd: number;
  valueUsd: number;
  timestamp: number;
  blockNumber: number;
  source: Source;
}

export interface IndexedLaunch {
  tokenAddress: string;
  creatorAddress: string;
  launchpad: Source;
  timestamp: number;
  bondingCurve?: string;
  graduated: boolean;
  graduatedAt?: number;
  txHash: string;
}

export interface AdapterResult {
  tokens: IndexedToken[];
  markets: IndexedMarket[];
  trades: IndexedTrade[];
  launches: IndexedLaunch[];
}

// Trending score formula (documented):
// score = (volume1h * 4) + (volume24h * 0.5) + (buys24h * 10) + (priceChange1h > 0 ? priceChange1h * 2 : 0) + (recencyBoost)
// recencyBoost = max(0, 100 - ageInHours * 2)
export function calcTrendingScore(market: IndexedMarket, ageHours: number): number {
  const recencyBoost = Math.max(0, 100 - ageHours * 2);
  const gainBoost = market.priceChange1h > 0 ? market.priceChange1h * 2 : 0;
  return (
    market.volumeUsd1h * 4 +
    market.volumeUsd24h * 0.5 +
    market.buys24h * 10 +
    gainBoost +
    recencyBoost
  );
}
