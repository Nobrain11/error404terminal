import { NextRequest, NextResponse } from "next/server";

const CHAIN_ID = "robinhood";
const BASE = "https://api.dexscreener.com";

type DexPair = {
  chainId?: string;
  pairAddress?: string;
  dexId?: string;
  url?: string;

  baseToken?: {
    address?: string;
    name?: string;
    symbol?: string;
  };

  priceUsd?: string;

  priceChange?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };

  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };

  volume?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };

  txns?: {
    m5?: {
      buys?: number;
      sells?: number;
    };
    h1?: {
      buys?: number;
      sells?: number;
    };
    h6?: {
      buys?: number;
      sells?: number;
    };
    h24?: {
      buys?: number;
      sells?: number;
    };
  };

  marketCap?: number;
  fdv?: number;

  pairCreatedAt?: number;

  info?: {
    imageUrl?: string;
    websites?: Array<{
      url?: string;
    }>;
    socials?: Array<{
      type?: string;
      url?: string;
    }>;
  };
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNum(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "N/A";
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toFixed(2);
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "$0";
  }

  if (value < 0.000001) {
    return `$${value.toExponential(2)}`;
  }

  if (value < 0.001) {
    return `$${value.toFixed(8)}`;
  }

  if (value < 1) {
    return `$${value.toFixed(6)}`;
  }

  if (value >= 1000) {
    return `$${value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${value.toFixed(4)}`;
}

function getAge(timestamp?: number): string {
  if (!timestamp) {
    return "N/A";
  }

  const diff = Math.max(0, Date.now() - timestamp);

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;

  return "new";
}

/**
 * Pick the best pair for a token.
 *
 * We prefer:
 * 1. Robinhood Chain
 * 2. Real liquidity
 * 3. Highest liquidity
 *
 * This prevents the API from randomly using the first pair returned.
 */
function selectBestPair(pairs: DexPair[]): DexPair | null {
  const valid = pairs.filter((pair) => {
    return (
      pair.chainId === CHAIN_ID &&
      !!pair.pairAddress &&
      !!pair.baseToken?.address &&
      num(pair.liquidity?.usd) > 0
    );
  });

  if (valid.length === 0) {
    return null;
  }

  return valid.sort(
    (a, b) =>
      num(b.liquidity?.usd) -
      num(a.liquidity?.usd)
  )[0];
}

function formatPair(pair: DexPair) {
  const price = num(pair.priceUsd);

  const marketCap =
    pair.marketCap !== undefined &&
    Number.isFinite(Number(pair.marketCap))
      ? num(pair.marketCap)
      : null;

  const liquidity = num(pair.liquidity?.usd);

  const volume24h = num(pair.volume?.h24);

  const buys24h = num(pair.txns?.h24?.buys);
  const sells24h = num(pair.txns?.h24?.sells);

  return {
    // Token
    ca: pair.baseToken?.address || "",
    name: pair.baseToken?.name || "Unknown",
    ticker: pair.baseToken?.symbol || "???",

    // Price
    price,
    priceFormatted: formatPrice(price),

    // Changes
    change5m: num(pair.priceChange?.m5),
    change1h: num(pair.priceChange?.h1),
    change6h: num(pair.priceChange?.h6),
    change24h: num(pair.priceChange?.h24),

    // IMPORTANT:
    // Do NOT use FDV as market cap.
    mcap: marketCap,
    mcapFormatted:
      marketCap !== null
        ? formatNum(marketCap)
        : "N/A",

    // Actual pool liquidity
    liq: liquidity,
    liqFormatted: formatNum(liquidity),

    // Actual pair volume
    vol24h: volume24h,
    vol1h: num(pair.volume?.h1),
    volFormatted: formatNum(volume24h),

    // Actual pair transactions
    buys24h,
    sells24h,

    // Pair age
    age: getAge(pair.pairCreatedAt),
    ageMs: pair.pairCreatedAt || 0,

    // Pool information
    source: pair.dexId || "unknown",
    dexId: pair.dexId || "unknown",
    pairAddress: pair.pairAddress || "",

    // Links
    dexUrl:
      pair.url ||
      `https://dexscreener.com/robinhood/${pair.pairAddress}`,

    // Images / socials
    imageUrl: pair.info?.imageUrl || "",

    website:
      pair.info?.websites?.[0]?.url || "",

    telegram:
      pair.info?.socials?.find(
        (social) => social.type === "telegram"
      )?.url || "",

    twitter:
      pair.info?.socials?.find(
        (social) => social.type === "twitter"
      )?.url || "",
  };
}

/**
 * Search DexScreener and return only Robinhood Chain pairs.
 */
async function dexSearch(query: string): Promise<DexPair[]> {
  try {
    const response = await fetch(
      `${BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/json",
        },

        // Keep the server-side cache short.
        next: {
          revalidate: 10,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "DexScreener search failed:",
        response.status
      );

      return [];
    }

    const data = await response.json();

    return (data.pairs || []).filter(
      (pair: DexPair) =>
        pair.chainId === CHAIN_ID &&
        num(pair.liquidity?.usd) > 0
    );
  } catch (error) {
    console.error("DexScreener search error:", error);
    return [];
  }
}

/**
 * Get token information by contract address.
 */
async function getTokenByAddress(
  address: string
): Promise<DexPair | null> {
  try {
    const response = await fetch(
      `${BASE}/latest/dex/tokens/${address}`,
      {
        headers: {
          Accept: "application/json",
        },

        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    const pairs: DexPair[] = Array.isArray(data.pairs)
      ? data.pairs
      : [];

    // IMPORTANT:
    // Never just use data.pairs[0].
    return selectBestPair(pairs);
  } catch (error) {
    console.error("Token lookup error:", error);
    return null;
  }
}

/**
 * Score a pair for the Discover/Trending page.
 *
 * This is only for ordering the UI.
 * It does NOT change the actual market statistics.
 */
function trendingScore(pair: DexPair): number {
  const liquidity = num(pair.liquidity?.usd);
  const volume24h = num(pair.volume?.h24);
  const volume1h = num(pair.volume?.h1);

  const buys = num(pair.txns?.h24?.buys);
  const sells = num(pair.txns?.h24?.sells);

  const change24h = num(pair.priceChange?.h24);

  const totalTxns = buys + sells;

  const buyRatio =
    totalTxns > 0
      ? buys / totalTxns
      : 0;

  // Avoid enormous tokens completely dominating the list.
  const liquidityScore =
    Math.min(Math.log10(Math.max(liquidity, 1)) * 10, 100);

  const volumeScore =
    Math.min(Math.log10(Math.max(volume24h, 1)) * 8, 100);

  const recentVolumeScore =
    Math.min(Math.log10(Math.max(volume1h, 1)) * 12, 100);

  const transactionScore =
    Math.min(totalTxns * 0.5, 100);

  const buyPressure =
    buyRatio * 50;

  const momentum =
    Math.max(-20, Math.min(change24h, 20));

  return (
    liquidityScore +
    volumeScore +
    recentVolumeScore +
    transactionScore +
    buyPressure +
    momentum
  );
}

// Search terms used for Discover.
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
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q");
  const ca = searchParams.get("ca");
  const sort = searchParams.get("sort") || "trending";

  try {
    /**
     * ------------------------------------------
     * SINGLE TOKEN LOOKUP
     * ------------------------------------------
     */
    if (ca) {
      const pair = await getTokenByAddress(ca);

      if (!pair) {
        return NextResponse.json(
          {
            error:
              "Token not found on Robinhood Chain",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        formatPair(pair),
        {
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    /**
     * ------------------------------------------
     * SEARCH
     * ------------------------------------------
     */
    if (q) {
      const pairs = await dexSearch(q);

      // Group pairs by token address.
      const tokenMap = new Map<
        string,
        DexPair
      >();

      for (const pair of pairs) {
        const tokenAddress =
          pair.baseToken?.address?.toLowerCase();

        if (!tokenAddress) continue;

        const existing =
          tokenMap.get(tokenAddress);

        if (
          !existing ||
          num(pair.liquidity?.usd) >
            num(existing.liquidity?.usd)
        ) {
          tokenMap.set(
            tokenAddress,
            pair
          );
        }
      }

      const results = Array.from(
        tokenMap.values()
      )
        .slice(0, 30)
        .map(formatPair);

      return NextResponse.json(results, {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      });
    }

    /**
     * ------------------------------------------
     * DISCOVER / TRENDING
     * ------------------------------------------
     */
    const results =
      await Promise.allSettled(
        TRENDING_QUERIES.map(
          (query) => dexSearch(query)
        )
      );

    /**
     * Group everything by token address.
     *
     * This is important because the same token can
     * appear from multiple search queries and pools.
     */
    const tokenPairs =
      new Map<string, DexPair[]>();

    for (const result of results) {
      if (result.status !== "fulfilled") {
        continue;
      }

      for (const pair of result.value) {
        const address =
          pair.baseToken?.address?.toLowerCase();

        if (!address) continue;

        const existing =
          tokenPairs.get(address) || [];

        existing.push(pair);

        tokenPairs.set(
          address,
          existing
        );
      }
    }

    /**
     * Pick ONE best pool for every token.
     */
    const uniqueTokens: DexPair[] = [];

    for (const pairs of tokenPairs.values()) {
      const best = selectBestPair(pairs);

      if (best) {
        uniqueTokens.push(best);
      }
    }

    /**
     * ------------------------------------------
     * SORTING
     * ------------------------------------------
     */
    let sorted = [...uniqueTokens];

    if (sort === "new") {
      sorted.sort(
        (a, b) =>
          num(b.pairCreatedAt) -
          num(a.pairCreatedAt)
      );
    }

    else if (sort === "volume") {
      sorted.sort(
        (a, b) =>
          num(b.volume?.h24) -
          num(a.volume?.h24)
      );
    }

    else if (sort === "gainers") {
      sorted.sort(
        (a, b) =>
          num(b.priceChange?.h24) -
          num(a.priceChange?.h24)
      );
    }

    else if (sort === "losers") {
      sorted.sort(
        (a, b) =>
          num(a.priceChange?.h24) -
          num(b.priceChange?.h24)
      );
    }

    else {
      sorted.sort(
        (a, b) =>
          trendingScore(b) -
          trendingScore(a)
      );
    }

    return NextResponse.json(
      sorted
        .slice(0, 60)
        .map(formatPair),
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  }

  catch (error) {
    console.error(
      "Market API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Market data unavailable",
      },
      {
        status: 500,
      }
    );
  }
}
