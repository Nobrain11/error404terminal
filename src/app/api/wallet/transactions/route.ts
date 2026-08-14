import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://rpc.mainnet.chain.robinhood.com";

const CHAIN_ID = 4663;

const BLOCKSCOUT =
  "https://robinhoodchain.blockscout.com/api/v2";

function validAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address) &&
    ethers.isAddress(address);
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function fetchJson(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      next: {
        revalidate: 10,
      },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

function shorten(address: string) {
  if (!address) return "";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeTransaction(
  tx: any,
  wallet: string
) {
  const hash =
    tx?.hash ||
    tx?.transaction_hash ||
    tx?.tx_hash;

  if (!hash) return null;

  const from =
    tx?.from?.hash ||
    tx?.from ||
    "";

  const to =
    tx?.to?.hash ||
    tx?.to ||
    "";

  const isOutgoing =
    from.toLowerCase() === wallet.toLowerCase();

  const status =
    tx?.status ||
    tx?.result ||
    "ok";

  const timestamp =
    tx?.timestamp ||
    tx?.block_timestamp ||
    tx?.created_at ||
    null;

  const valueRaw =
    tx?.value ||
    tx?.raw_value ||
    "0";

  let valueEth = "0";

  try {
    valueEth = ethers.formatEther(
      BigInt(String(valueRaw))
    );
  } catch {
    valueEth = "0";
  }

  const feeRaw =
    tx?.fee?.value ||
    tx?.fee ||
    "0";

  let feeEth = "0";

  try {
    feeEth = ethers.formatEther(
      BigInt(String(feeRaw))
    );
  } catch {
    feeEth = "0";
  }

  return {
    hash,
    shortHash: shorten(hash),

    from,
    to,

    fromShort: from
      ? shorten(from)
      : "",

    toShort: to
      ? shorten(to)
      : "",

    direction: isOutgoing
      ? "out"
      : "in",

    type:
      tx?.method ||
      tx?.transaction_types?.[0] ||
      "transaction",

    status:
      String(status).toLowerCase() ===
      "ok"
        ? "success"
        : String(status).toLowerCase(),

    valueRaw: String(valueRaw),

    valueEth,

    feeRaw: String(feeRaw),

    feeEth,

    blockNumber:
      tx?.block ||
      tx?.block_number ||
      null,

    timestamp,

    explorerUrl:
      `https://robinhoodchain.blockscout.com/tx/${hash}`,
  };
}

export async function GET(
  req: NextRequest
) {
  const url = new URL(req.url);

  const address =
    url.searchParams
      .get("address")
      ?.trim() || "";

  const requestedLimit =
    Number(
      url.searchParams.get("limit") || 50
    );

  const limit = Math.min(
    Math.max(requestedLimit, 1),
    100
  );

  if (!validAddress(address)) {
    return NextResponse.json(
      {
        error:
          "Valid wallet address required",
      },
      { status: 400 }
    );
  }

  try {
    /*
     * Primary source:
     * Blockscout address transaction endpoint.
     */
    const data = await fetchJson(
      `${BLOCKSCOUT}/addresses/${address}/transactions?filter=validated`
    );

    let rawTransactions: any[] = [];

    if (Array.isArray(data)) {
      rawTransactions = data;
    } else if (
      Array.isArray(data?.items)
    ) {
      rawTransactions = data.items;
    }

    /*
     * Fallback endpoint.
     *
     * Some Blockscout deployments return the
     * transaction collection under /transactions.
     */
    if (
      rawTransactions.length === 0
    ) {
      const fallback =
        await fetchJson(
          `${BLOCKSCOUT}/addresses/${address}/transactions`
        );

      if (Array.isArray(fallback)) {
        rawTransactions = fallback;
      } else if (
        Array.isArray(fallback?.items)
      ) {
        rawTransactions =
          fallback.items;
      }
    }

    /*
     * Normalize and remove duplicates.
     */
    const seen = new Set<string>();

    const transactions =
      rawTransactions
        .map((tx) =>
          normalizeTransaction(
            tx,
            address
          )
        )
        .filter(Boolean)
        .filter((tx: any) => {
          if (seen.has(tx.hash)) {
            return false;
          }

          seen.add(tx.hash);

          return true;
        })
        .slice(0, limit);

    /*
     * Most recent first.
     */
    transactions.sort(
      (a: any, b: any) => {
        const aTime = a.timestamp
          ? new Date(
              a.timestamp
            ).getTime()
          : 0;

        const bTime = b.timestamp
          ? new Date(
              b.timestamp
            ).getTime()
          : 0;

        return bTime - aTime;
      }
    );

    return NextResponse.json(
      {
        success: true,

        address,

        chainId: CHAIN_ID,

        network:
          "Robinhood Chain",

        count:
          transactions.length,

        transactions,

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
      "Transaction history error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load transaction history",
        transactions: [],
      },
      { status: 502 }
    );
  }
}
