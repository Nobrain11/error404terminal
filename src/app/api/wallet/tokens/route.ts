import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://rpc.mainnet.chain.robinhood.com";

const CHAIN_ID = 4663;

const provider = new ethers.JsonRpcProvider(
  RPC,
  CHAIN_ID
);

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

const BLOCKSCOUT =
  "https://robinhoodchain.blockscout.com/api/v2";

function validAddress(address: string) {
  return ethers.isAddress(address);
}

async function fetchJson(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(8000),
      next: {
        revalidate: 15
      }
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const address =
    url.searchParams.get("address")?.trim() || "";

  if (!validAddress(address)) {
    return NextResponse.json(
      {
        success: false,
        error: "Valid wallet address required",
        tokens: []
      },
      { status: 400 }
    );
  }

  try {
    const wallet = ethers.getAddress(address);

    const ethBalance =
      await provider.getBalance(wallet);

    const tokensResponse =
      await fetchJson(
        `${BLOCKSCOUT}/addresses/${wallet}/token-balances`
      );

    const items =
      Array.isArray(tokensResponse)
        ? tokensResponse
        : Array.isArray(tokensResponse?.items)
          ? tokensResponse.items
          : [];

    const tokens = [];

    for (const item of items) {
      try {
        const token =
          item?.token || {};

        const tokenAddress =
          token?.address ||
          token?.hash ||
          item?.token_address ||
          "";

        if (
          !tokenAddress ||
          !ethers.isAddress(tokenAddress)
        ) {
          continue;
        }

        const rawBalance =
          item?.value ||
          item?.balance ||
          item?.raw_balance ||
          "0";

        const decimals = Number(
          token?.decimals ??
          item?.decimals ??
          18
        );

        let balance = "0";

        try {
          balance = ethers.formatUnits(
            String(rawBalance),
            decimals
          );
        } catch {
          continue;
        }

        if (BigInt(String(rawBalance)) === 0n) {
          continue;
        }

        tokens.push({
          address:
            ethers.getAddress(tokenAddress),

          name:
            token?.name ||
            item?.name ||
            "Unknown Token",

          symbol:
            token?.symbol ||
            item?.symbol ||
            "TOKEN",

          decimals,

          rawBalance:
            String(rawBalance),

          balance
        });
      } catch {
        // Ignore malformed token entries.
      }
    }

    return NextResponse.json({
      success: true,

      chainId: CHAIN_ID,

      network:
        "Robinhood Chain",

      address: wallet,

      native: {
        symbol: "ETH",

        rawBalance:
          ethBalance.toString(),

        balance:
          ethers.formatEther(
            ethBalance
          )
      },

      tokens,

      tokenCount:
        tokens.length,

      updatedAt:
        new Date().toISOString()
    });
  } catch (error) {
    console.error(
      "Wallet token discovery failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to discover wallet assets",
        tokens: []
      },
      { status: 502 }
    );
  }
}
