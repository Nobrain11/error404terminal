import { NextRequest, NextResponse } from "next/server";

const CHAIN = "robinhood";
const BASE = "https://api.dexscreener.com";

function formatNum(n: number): string {
  if (!n || isNaN(n)) return "N/A";

  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(2)}B`;
  }

  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }

  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }

  return `${n.toFixed(2)}`;
}

function formatPrice(p: number): string {
  if (!p || isNaN(p)) return "$0";

  if (p < 0.000001) {
    return `$${p.toExponential(2)}`;
  }

  if (p < 0.001) {
    return `$${p.toFixed(8)}`;
  }

  if (p < 1) {
    return `$${p.toFixed(6)}`;
  }

  if (p >= 1000) {
    return `$${p.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}`;
  }

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
  const price = Number(pair.priceUsd || 0);

  const marketCap = Number(
    pair.marketCap ??
      pair.fdv ??
      0
  );

  const liquidity = Number(
    pair.liquidity?.usd ??
      0
  );

  const volume24h = Number(
    pair.volume?.h24 ??
      0
  );

  const volume1h = Number(
    pair.volume?.h1 ??
      0
  );

  const buys24h = Number(
    pair.txns?.h24?.buys ??
      0
  );

  const sells24h = Number(
    pair.txns?.h24?.sells ??
      0
  );

  return {
    // Token
    ca: pair.baseToken?.address || "",
    name: pair.baseToken?.name || "Unknown",
    ticker: pair.baseToken?.symbol || "???",

    // Price
    price,
    priceFormatted: formatPrice(price),

    // Changes
    change5m: Number(pair.priceChange?.m5 || 0),
    change1h: Number(pair.priceChange?.h1 || 0),
    change6h: Number(pair.priceChange?.h6 || 0),
    change24h: Number(pair.priceChange?.h24 || 0),

    // Market data
    mcap: marketCap,
    mcapFormatted: formatNum(marketCap),

    liq: liquidity,
    liqFormatted: formatNum(liquidity),

    vol24h: volume24h,
    vol1h: volume1h,
    volFormatted: formatNum(volume24h),

    // Transactions
    buys24h,
    sells24h,

    // Age
    age: getAge(pair.pairCreatedAt),
    ageMs: pair.pairCreatedAt || 0,

    // Pair information
    pairAddress: pair.pairAddress || "",
    dexId: pair.dexId || "",
    source: pair.dexId || "unknown",

    // Links
    dexUrl:
      pair.url ||
      `https://dexscreener.com/${CHAIN}/${pair.pairAddress}`,

    // Socials
    imageUrl: pair.info?.imageUrl || "",

    website:
      pair.info?.websites?.[0]?.url || "",

    telegram:
      pair.info?.socials?.find(
        (s: any) => s.type === "telegram"
      )?.url || "",

    twitter:
      pair.info?.socials?.find(
        (s: any) => s.type === "twitter"
      )?.url || "",
  };
}

function trendingScore(pair: any): number {
  const vol24 = Number(pair.volume?.h24 || 0);
  const vol1h = Number(pair.volume?.h1 || 0);

  const buys24 = Number(pair.txns?.h24?.buys || 0);

  const change24 = Number(
    pair.priceChange?.h24 || 0
  );

  const liq = Number(
    pair.liquidity?.usd || 0
  );

  const ageHours = pair.pairCreatedAt
    ? (Date.now() - pair.pairCreatedAt) / 3600000
    : 9999;

  const recency = Math.max(
    0,
    200 - ageHours * 0.5
  );

  const volScore =
    vol1h * 5 +
    vol24 * 0.3;

  const buyScore =
    buys24 * 20;

  const momentumScore =
    change24 > 0
      ? change24 * 3
      : 0;

  const liqScore =
    Math.min(liq / 1000, 100);

  return (
    volScore +
    buyScore +
    momentumScore +
    recency +
    liqScore
  );
}

async function dexSearch(
  query: string
): Promise<any[]> {
  try {
    const res = await fetch(
      `${BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: {
          revalidate: 20,
        },
      }
    );

    if (!res.ok) {
      return [];
    }

    const data = await res.json();

    return (data.pairs || []).filter(
      (p: any) =>
        p.chainId === CHAIN &&
        Number(p.liquidity?.usd || 0) > 500
    );
  } catch {
    return [];
  }
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

  const q =
    searchParams.get("q");

  const ca =
    searchParams.get("ca");

  const pairAddress =
    searchParams.get("pair");

  const sort =
    searchParams.get("sort") ||
    "trending";

  try {
    /*
     * =====================================================
     * EXACT PAIR LOOKUP
     * =====================================================
     *
     * This is the important fix.
     *
     * If the frontend gives us the pairAddress,
     * we fetch THAT exact pair instead of asking
     * DexScreener for the token and randomly selecting
     * one of its pairs.
     */

    if (pairAddress) {
      const res = await fetch(
        `${BASE}/latest/dex/pairs/${CHAIN}/${pairAddress}`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        return NextResponse.json(
          {
            error: "Pair not found",
          },
          {
            status: 404,
          }
        );
      }

      const data =
        await res.json();

      const pair =
        data.pairs?.[0];

      if (
        !pair ||
        pair.chainId !== CHAIN
      ) {
        return NextResponse.json(
          {
            error: "Pair not found",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json(
        formatPair(pair)
      );
    }

    /*
     * =====================================================
     * TOKEN CONTRACT LOOKUP
     * =====================================================
     *
     * This remains as a fallback when there is no
     * pairAddress.
     */

    if (ca) {
      const res = await fetch(
        `${BASE}/latest/dex/tokens/${ca}`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        return NextResponse.json(
          {
            error: "Token not found",
          },
          {
            status: 404,
          }
        );
      }

      const data =
        await res.json();

      const robinhoodPairs =
        (data.pairs || []).filter(
          (p: any) =>
            p.chainId === CHAIN
        );

      /*
       * If there are multiple pools,
       * choose the pool with the most liquidity.
       *
       * This is only a fallback.
       * The exact pair lookup above is preferred.
       */

      const pair =
        robinhoodPairs.sort(
          (a: any, b: any) =>
            Number(
              b.liquidity?.usd || 0
            ) -
            Number(
              a.liquidity?.usd || 0
            )
        )[0];

      if (!pair) {
        return NextResponse.json(
          {
            error: "Token not found on Robinhood Chain",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json(
        formatPair(pair)
      );
    }

    /*
     * =====================================================
     * SEARCH
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
     * TRENDING
     * =====================================================
     */

    const results =
      await Promise.allSettled(
        TRENDING_QUERIES.map(
          (query) =>
            dexSearch(query)
        )
      );

    const seen =
      new Set<string>();

    const tokenCount =
      new Map<string, number>();

    const pairs: any[] = [];

    for (const result of results) {
      if (
        result.status !==
        "fulfilled"
      ) {
        continue;
      }

      for (const pair of result.value) {
        const pairKey =
          pair.pairAddress;

        const tokenKey =
          pair.baseToken?.address?.toLowerCase();

        if (
          !pairKey ||
          seen.has(pairKey)
        ) {
          continue;
        }

        /*
         * Only one pair per token
         * in Discover.
         */

        const count =
          tokenCount.get(
            tokenKey
          ) || 0;

        if (count >= 1) {
          continue;
        }

        seen.add(pairKey);

        tokenCount.set(
          tokenKey,
          count + 1
        );

        pairs.push(pair);
      }
    }

    let sorted =
      [...pairs];

    if (sort === "new") {
      sorted.sort(
        (a, b) =>
          (b.pairCreatedAt || 0) -
          (a.pairCreatedAt || 0)
      );
    } else if (
      sort === "volume"
    ) {
      sorted.sort(
        (a, b) =>
          Number(
            b.volume?.h24 || 0
          ) -
          Number(
            a.volume?.h24 || 0
          )
      );
    } else if (
      sort === "gainers"
    ) {
      sorted.sort(
        (a, b) =>
          Number(
            b.priceChange?.h24 || 0
          ) -
          Number(
            a.priceChange?.h24 || 0
          )
      );
    } else if (
      sort === "losers"
    ) {
      sorted.sort(
        (a, b) =>
          Number(
            a.priceChange?.h24 || 0
          ) -
          Number(
            b.priceChange?.h24 || 0
          )
      );
    } else {
      sorted.sort(
        (a, b) =>
          trendingScore(b) -
          trendingScore(a)
      );
    }

    return NextResponse.json(
      sorted
        .slice(0, 60)
        .map(formatPair)
    );
  } catch (err) {
    console.error(
      "Market API error:",
      err
    );

    return NextResponse.json(
      [],
      {
        status: 200,
      }
    );
  }
}
