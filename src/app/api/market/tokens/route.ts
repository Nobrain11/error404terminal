import { NextRequest, NextResponse } from "next/server";

const CHAIN = "robinhood";
const BASE = "https://api.dexscreener.com";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNum(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "N/A";

  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;

  return n.toFixed(2);
}

function formatPrice(p: number): string {
  if (!Number.isFinite(p) || p <= 0) return "$0";

  if (p < 0.000001) return `$${p.toExponential(2)}`;
  if (p < 0.001) return `$${p.toFixed(8)}`;
  if (p < 1) return `$${p.toFixed(6)}`;
  if (p >= 1000) {
    return `$${p.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${p.toFixed(4)}`;
}

function getAge(ts: number): string {
  if (!ts) return "N/A";

  const diff = Math.max(0, Date.now() - ts);

  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;

  return "new";
}

function formatPair(pair: any) {
  const marketCap = num(pair.marketCap);
  const fdv = num(pair.fdv);

  const liquidity = num(pair.liquidity?.usd);

  const volume24h = num(pair.volume?.h24);
  const volume1h = num(pair.volume?.h1);

  const buys24h = num(pair.txns?.h24?.buys);
  const sells24h = num(pair.txns?.h24?.sells);

  const price = num(pair.priceUsd);

  const pairCreatedAt = num(pair.pairCreatedAt);

  const socials = Array.isArray(pair.info?.socials)
    ? pair.info.socials
    : [];

  const websites = Array.isArray(pair.info?.websites)
    ? pair.info.websites
    : [];

  return {
    chain: CHAIN,

    // Token
    ca: pair.baseToken?.address || "",
    name: pair.baseToken?.name || "Unknown",
    ticker: pair.baseToken?.symbol || "???",

    // Exact pool
    pairAddress: pair.pairAddress || "",
    dexId: pair.dexId || "unknown",
    source: pair.dexId || "unknown",

    // Price
    price,
    priceFormatted: formatPrice(price),

    // Market cap
    // Prefer DexScreener marketCap.
    // Only use FDV if marketCap is genuinely unavailable.
    mcap: marketCap > 0 ? marketCap : fdv,
    mcapFormatted: formatNum(
      marketCap > 0 ? marketCap : fdv
    ),

    // Liquidity
    liq: liquidity,
    liqFormatted: formatNum(liquidity),

    // Volume
    vol24h: volume24h,
    vol1h: volume1h,
    volFormatted: formatNum(volume24h),

    // Transactions
    buys24h,
    sells24h,

    // Changes
    change5m: num(pair.priceChange?.m5),
    change1h: num(pair.priceChange?.h1),
    change6h: num(pair.priceChange?.h6),
    change24h: num(pair.priceChange?.h24),

    // Age
    age: getAge(pairCreatedAt),
    ageMs: pairCreatedAt,

    // Image
    imageUrl: pair.info?.imageUrl || "",

    // Website
    website: websites[0]?.url || "",

    // Socials
    telegram:
      socials.find(
        (s: any) => s.type === "telegram"
      )?.url || "",

    twitter:
      socials.find(
        (s: any) =>
          s.type === "twitter" ||
          s.type === "x"
      )?.url || "",

    // DexScreener
    dexUrl:
      pair.url ||
      `https://dexscreener.com/${CHAIN}/${pair.pairAddress}`,

    // Useful raw values for detail page
    baseToken: pair.baseToken || null,
    quoteToken: pair.quoteToken || null,
    quoteTokenAddress: pair.quoteToken?.address || "",
  };
}

function trendingScore(pair: any): number {
  const vol24 = num(pair.volume?.h24);
  const vol1h = num(pair.volume?.h1);
  const buys24 = num(pair.txns?.h24?.buys);
  const change24 = num(pair.priceChange?.h24);
  const liquidity = num(pair.liquidity?.usd);

  const ageHours = pair.pairCreatedAt
    ? Math.max(
        0,
        (Date.now() - Number(pair.pairCreatedAt)) /
          3_600_000
      )
    : 9999;

  const recency = Math.max(
    0,
    200 - ageHours * 0.5
  );

  const volumeScore =
    vol1h * 5 +
    vol24 * 0.3;

  const buyScore =
    buys24 * 20;

  const momentumScore =
    change24 > 0
      ? change24 * 3
      : 0;

  const liquidityScore =
    Math.min(liquidity / 1000, 100);

  return (
    volumeScore +
    buyScore +
    momentumScore +
    recency +
    liquidityScore
  );
}

async function dexSearch(
  query: string
): Promise<any[]> {
  try {
    const response = await fetch(
      `${BASE}/latest/dex/search?q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
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
      (pair: any) =>
        pair.chainId === CHAIN &&
        num(pair.liquidity?.usd) > 500
    );
  } catch (error) {
    console.error(
      "DexScreener search error:",
      error
    );

    return [];
  }
}

async function getExactPair(
  pairAddress: string
) {
  const response = await fetch(
    `${BASE}/latest/dex/pairs/${CHAIN}/${pairAddress}`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `DexScreener pair request failed: ${response.status}`
    );
  }

  const data = await response.json();

  const pair = (data.pairs || []).find(
    (p: any) =>
      p.chainId === CHAIN &&
      p.pairAddress?.toLowerCase() ===
        pairAddress.toLowerCase()
  );

  return pair || null;
}

async function getTokenPairs(
  ca: string
) {
  const response = await fetch(
    `${BASE}/latest/dex/tokens/${ca}`,
    {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `DexScreener token request failed: ${response.status}`
    );
  }

  const data = await response.json();

  return (data.pairs || []).filter(
    (p: any) =>
      p.chainId === CHAIN
  );
}

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

export async function GET(
  req: NextRequest
) {
  const { searchParams } =
    new URL(req.url);

  const ca =
    searchParams.get("ca");

  const pairAddress =
    searchParams.get("pair");

  const q =
    searchParams.get("q");

  const sort =
    searchParams.get("sort") ||
    "trending";

  try {
    /*
     * =====================================================
     * 1. EXACT PAIR
     * =====================================================
     *
     * This is the preferred detail-page lookup.
     *
     * Discover gives the detail page:
     *
     * CA + pairAddress
     *
     * The detail page then gets the exact same pool.
     */

    if (pairAddress) {
      const pair =
        await getExactPair(pairAddress);

      if (!pair) {
        return NextResponse.json(
          {
            error: "Pair not found on Robinhood Chain",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json(
        formatPair(pair),
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
     * =====================================================
     * 2. TOKEN LOOKUP
     * =====================================================
     *
     * Fallback when only a CA is supplied.
     *
     * We NEVER select a pair from another chain.
     *
     * If multiple Robinhood pairs exist, select the
     * highest-liquidity pair.
     */

    if (ca) {
      const pairs =
        await getTokenPairs(ca);

      if (!pairs.length) {
        return NextResponse.json(
          {
            error:
              "Token not found on Robinhood Chain",
          },
          {
            status: 404,
          }
        );
      }

      const bestPair =
        [...pairs].sort(
          (a: any, b: any) =>
            num(b.liquidity?.usd) -
            num(a.liquidity?.usd)
        )[0];

      return NextResponse.json(
        formatPair(bestPair),
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
     * =====================================================
     * 3. SEARCH
     * =====================================================
     */

    if (q) {
      const pairs =
        await dexSearch(q);

      return NextResponse.json(
        pairs
          .slice(0, 30)
          .map(formatPair)
      );
    }

    /*
     * =====================================================
     * 4. DISCOVER
     * =====================================================
     */

    const results =
      await Promise.allSettled(
        TRENDING_QUERIES.map(
          (query) =>
            dexSearch(query)
        )
      );

    const seenPairs =
      new Set<string>();

    const seenTokens =
      new Set<string>();

    const pairs: any[] = [];

    for (const result of results) {
      if (
        result.status !==
        "fulfilled"
      ) {
        continue;
      }

      for (const pair of result.value) {
        const pairAddress =
          pair.pairAddress;

        const tokenAddress =
          pair.baseToken?.address
            ?.toLowerCase();

        if (
          !pairAddress ||
          !tokenAddress
        ) {
          continue;
        }

        if (
          seenPairs.has(pairAddress)
        ) {
          continue;
        }

        /*
         * Discover displays one pool per token.
         */
        if (
          seenTokens.has(tokenAddress)
        ) {
          continue;
        }

        seenPairs.add(
          pairAddress
        );

        seenTokens.add(
          tokenAddress
        );

        pairs.push(pair);
      }
    }

    let sorted =
      [...pairs];

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
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Market API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Market data temporarily unavailable",
      },
      {
        status: 503,
      }
    );
  }
}
