import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://rpc.mainnet.chain.robinhood.com";

const CHAIN_ID = 4663;

const BLOCKSCOUT =
  "https://robinhoodchain.blockscout.com/api/v2";

const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value) && ethers.isAddress(value);
}

function numberOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function fetchJson(
  url: string,
  options: RequestInit = {}
): Promise<any | null> {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Get ETH/USD price from DexScreener.
 */
async function getEthPrice(): Promise<number> {
  const data = await fetchJson(
    `https://api.dexscreener.com/latest/dex/tokens/${WETH}`,
    {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 15,
      },
    } as RequestInit
  );

  if (!data?.pairs || !Array.isArray(data.pairs)) {
    return 0;
  }

  const robinhoodPairs = data.pairs.filter(
    (pair: any) => pair?.chainId === "robinhood"
  );

  const candidates =
    robinhoodPairs.length > 0 ? robinhoodPairs : data.pairs;

  const validPairs = candidates
    .filter((pair: any) => numberOrZero(pair?.priceUsd) > 0)
    .sort(
      (a: any, b: any) =>
        numberOrZero(b?.liquidity?.usd) -
        numberOrZero(a?.liquidity?.usd)
    );

  return numberOrZero(validPairs[0]?.priceUsd);
}

/**
 * Get token price from DexScreener.
 */
async function getTokenPrice(
  tokenAddress: string
): Promise<number> {
  const data = await fetchJson(
    `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
    {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 15,
      },
    } as RequestInit
  );

  if (!data?.pairs || !Array.isArray(data.pairs)) {
    return 0;
  }

  const robinhoodPairs = data.pairs.filter(
    (pair: any) => pair?.chainId === "robinhood"
  );

  const candidates =
    robinhoodPairs.length > 0 ? robinhoodPairs : data.pairs;

  const validPairs = candidates
    .filter(
      (pair: any) =>
        numberOrZero(pair?.priceUsd) > 0 &&
        numberOrZero(pair?.liquidity?.usd) >= 500
    )
    .sort(
      (a: any, b: any) =>
        numberOrZero(b?.liquidity?.usd) -
        numberOrZero(a?.liquidity?.usd)
    );

  return numberOrZero(validPairs[0]?.priceUsd);
}

/**
 * Get ERC20 token balances from Blockscout.
 *
 * Blockscout gives us the wallet's token inventory,
 * so we don't need to know every token contract in advance.
 */
async function getBlockscoutTokenBalances(
  address: string
): Promise<any[]> {
  const data = await fetchJson(
    `${BLOCKSCOUT}/addresses/${address}/token-balances`,
    {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 15,
      },
    } as RequestInit
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data;
}

/**
 * Normalize a Blockscout token balance.
 */
function normalizeBlockscoutToken(row: any) {
  const token = row?.token || row;

  const address =
    token?.address ||
    row?.token_address ||
    row?.contract_address;

  if (!address || !ethers.isAddress(address)) {
    return null;
  }

  const decimals =
    token?.decimals !== undefined
      ? numberOrZero(token.decimals)
      : row?.decimals !== undefined
        ? numberOrZero(row.decimals)
        : 18;

  const rawBalance =
    row?.value ??
    row?.balance ??
    row?.raw_balance ??
    "0";

  let amount = "0";

  try {
    amount = ethers.formatUnits(
      String(rawBalance),
      decimals
    );
  } catch {
    amount = "0";
  }

  const amountNumber = numberOrZero(amount);

  if (amountNumber <= 0) {
    return null;
  }

  return {
    address,
    name: token?.name || "Unknown Token",
    symbol: token?.symbol || "TOKEN",
    decimals,
    rawBalance: String(rawBalance),
    amount,
    verified:
      Boolean(token?.is_verified) ||
      Boolean(token?.verified),
  };
}

/**
 * GET /api/wallet/balance?address=0x...
 *
 * Returns:
 * - ETH balance
 * - ETH USD value
 * - ERC20 balances
 * - token prices
 * - token USD values
 * - total portfolio value
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const address =
    url.searchParams.get("address")?.trim() || "";

  if (!isValidAddress(address)) {
    return NextResponse.json(
      {
        error: "Valid wallet address required",
      },
      { status: 400 }
    );
  }

  try {
    const provider = new ethers.JsonRpcProvider(
      RPC,
      CHAIN_ID,
      {
        staticNetwork: true,
      }
    );

    /*
     * Fetch ETH balance and token inventory concurrently.
     */
    const [ethRawBalance, blockscoutTokens] =
      await Promise.all([
        provider.getBalance(address),
        getBlockscoutTokenBalances(address),
      ]);

    const ethBalance =
      ethers.formatEther(ethRawBalance);

    /*
     * ETH price.
     */
    const ethPrice = await getEthPrice();

    const ethValueUsd =
      numberOrZero(ethBalance) * ethPrice;

    /*
     * Normalize token inventory.
     */
    const normalizedTokens = blockscoutTokens
      .map(normalizeBlockscoutToken)
      .filter(Boolean);

    /*
     * Remove WETH from normal ERC20 display if desired,
     * because the terminal treats native ETH as the primary
     * wallet balance.
     */
    const tokenCandidates = normalizedTokens.filter(
      (token: any) =>
        token.address.toLowerCase() !==
        WETH.toLowerCase()
    );

    /*
     * Limit pricing requests so a wallet containing hundreds
     * of dust tokens doesn't hammer DexScreener.
     *
     * Highest balances get priority.
     */
    tokenCandidates.sort(
      (a: any, b: any) =>
        numberOrZero(b.amount) -
        numberOrZero(a.amount)
    );

    const pricedTokens = await Promise.all(
      tokenCandidates.slice(0, 50).map(
        async (token: any) => {
          const priceUsd = await getTokenPrice(
            token.address
          );

          const valueUsd =
            numberOrZero(token.amount) *
            priceUsd;

          return {
            ...token,
            priceUsd: priceUsd.toString(),
            valueUsd: valueUsd.toFixed(2),
          };
        }
      )
    );

    /*
     * Remove tokens that have zero USD value unless they
     * have a meaningful balance. This prevents dead/dust
     * contracts from filling the portfolio UI.
     */
    const tokens = pricedTokens.filter(
      (token: any) =>
        numberOrZero(token.amount) > 0
    );

    /*
     * Sort by USD portfolio value.
     */
    tokens.sort(
      (a: any, b: any) =>
        numberOrZero(b.valueUsd) -
        numberOrZero(a.valueUsd)
    );

    const tokenValueUsd = tokens.reduce(
      (total: number, token: any) =>
        total + numberOrZero(token.valueUsd),
      0
    );

    const totalValueUsd =
      ethValueUsd + tokenValueUsd;

    /*
     * Allocation.
     */
    const portfolioTokens = tokens.map(
      (token: any) => ({
        ...token,
        allocation:
          totalValueUsd > 0
            ? (
                (numberOrZero(token.valueUsd) /
                  totalValueUsd) *
                100
              ).toFixed(2)
            : "0.00",
      })
    );

    const ethAllocation =
      totalValueUsd > 0
        ? (
            (ethValueUsd / totalValueUsd) *
            100
          ).toFixed(2)
        : "0.00";

    return NextResponse.json(
      {
        success: true,

        address,

        chainId: CHAIN_ID,

        network: "Robinhood Chain",

        /*
         * Native ETH.
         */
        eth: {
          balance: ethBalance,
          priceUsd: ethPrice.toFixed(2),
          valueUsd: ethValueUsd.toFixed(2),
          allocation: ethAllocation,
        },

        /*
         * Backwards-compatible fields.
         */
        balance: ethBalance,

        balanceUsd:
          totalValueUsd.toFixed(2),

        ethBalance,

        ethPrice:
          ethPrice.toFixed(2),

        ethValueUsd:
          ethValueUsd.toFixed(2),

        /*
         * ERC20 portfolio.
         */
        tokens: portfolioTokens,

        tokenCount:
          portfolioTokens.length,

        tokenValueUsd:
          tokenValueUsd.toFixed(2),

        /*
         * Total portfolio.
         */
        totalValueUsd:
          totalValueUsd.toFixed(2),

        updatedAt:
          new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "private, max-age=10, stale-while-revalidate=20",
        },
      }
    );
  } catch (error) {
    console.error(
      "Wallet balance error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to fetch wallet balances",
      },
      { status: 502 }
    );
  }
}
