import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const BLOCKSCOUT =
  "https://robinhoodchain.blockscout.com/api/v2";

const CHAIN_ID = 4663;

const ERC20_TRANSFER_TOPIC = ethers.id(
  "Transfer(address,address,uint256)"
);

function validAddress(address: string) {
  return ethers.isAddress(address);
}

function shorten(value: string) {
  if (!value) return "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatAmount(
  value: bigint,
  decimals: number
) {
  try {
    return ethers.formatUnits(value, decimals);
  } catch {
    return "0";
  }
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

function decodeTransfer(
  log: any,
  wallet: string
) {
  try {
    const topics = log?.topics || [];

    if (
      !topics.length ||
      topics[0]?.toLowerCase() !==
        ERC20_TRANSFER_TOPIC.toLowerCase()
    ) {
      return null;
    }

    if (topics.length < 3) return null;

    const from =
      ethers.getAddress(
        `0x${topics[1].slice(-40)}`
      );

    const to =
      ethers.getAddress(
        `0x${topics[2].slice(-40)}`
      );

    const walletLower =
      wallet.toLowerCase();

    const fromLower =
      from.toLowerCase();

    const toLower =
      to.toLowerCase();

    if (
      fromLower !== walletLower &&
      toLower !== walletLower
    ) {
      return null;
    }

    const rawValue = BigInt(
      log?.data || "0x0"
    );

    const tokenAddress =
      log?.address || "";

    return {
      tokenAddress,
      tokenSymbol:
        log?.token?.symbol ||
        log?.token_symbol ||
        "TOKEN",

      tokenName:
        log?.token?.name ||
        log?.token_name ||
        "Token",

      decimals: Number(
        log?.token?.decimals ?? 18
      ),

      rawAmount:
        rawValue.toString(),

      amount: formatAmount(
        rawValue,
        Number(
          log?.token?.decimals ?? 18
        )
      ),

      from,
      to,

      direction:
        toLower === walletLower
          ? "in"
          : "out",

      logIndex:
        log?.index ??
        log?.log_index ??
        null,
    };
  } catch {
    return null;
  }
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
    from.toLowerCase() ===
    wallet.toLowerCase();

  const valueRaw =
    tx?.value ||
    tx?.raw_value ||
    "0";

  let valueEth = "0";

  try {
    valueEth = ethers.formatEther(
      BigInt(String(valueRaw))
    );
  } catch {}

  const feeRaw =
    tx?.fee?.value ||
    tx?.fee ||
    "0";

  let feeEth = "0";

  try {
    feeEth = ethers.formatEther(
      BigInt(String(feeRaw))
    );
  } catch {}

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

    direction:
      isOutgoing
        ? "out"
        : "in",

    type:
      tx?.method ||
      tx?.transaction_types?.[0] ||
      "transaction",

    status:
      String(
        tx?.status ||
          tx?.result ||
          "ok"
      ).toLowerCase() === "ok"
        ? "success"
        : String(
            tx?.status ||
              tx?.result ||
              "unknown"
          ).toLowerCase(),

    valueRaw:
      String(valueRaw),

    valueEth,

    feeRaw:
      String(feeRaw),

    feeEth,

    blockNumber:
      tx?.block ||
      tx?.block_number ||
      null,

    timestamp:
      tx?.timestamp ||
      tx?.block_timestamp ||
      tx?.created_at ||
      null,

    explorerUrl:
      `https://robinhoodchain.blockscout.com/tx/${hash}`,

    tokens: [],
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
      url.searchParams.get("limit") ||
        "50"
    );

  const limit = Math.min(
    Math.max(
      Number.isFinite(
        requestedLimit
      )
        ? requestedLimit
        : 50,
      1
    ),
    100
  );

  if (
    !address ||
    !validAddress(address)
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Valid wallet address required",
        transactions: [],
      },
      { status: 400 }
    );
  }

  try {
    const data =
      await fetchJson(
        `${BLOCKSCOUT}/addresses/${address}/transactions?filter=validated`
      );

    let rawTransactions: any[] = [];

    if (
      Array.isArray(data)
    ) {
      rawTransactions = data;
    } else if (
      Array.isArray(
        data?.items
      )
    ) {
      rawTransactions =
        data.items;
    }

    if (
      rawTransactions.length === 0
    ) {
      const fallback =
        await fetchJson(
          `${BLOCKSCOUT}/addresses/${address}/transactions`
        );

      if (
        Array.isArray(
          fallback
        )
      ) {
        rawTransactions =
          fallback;
      } else if (
        Array.isArray(
          fallback?.items
        )
      ) {
        rawTransactions =
          fallback.items;
      }
    }

    const seen =
      new Set<string>();

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
          if (
            seen.has(tx.hash)
          ) {
            return false;
          }

          seen.add(tx.hash);

          return true;
        })
        .slice(0, limit);

    /*
     * Fetch token transfer events for each
     * transaction. We intentionally keep this
     * bounded so one Activity request cannot
     * hammer the explorer API.
     */
    for (
      const transaction of transactions
    ) {
      try {
        const logs =
          await fetchJson(
            `${BLOCKSCOUT}/transactions/${transaction.hash}/token-transfers`
          );

        const items =
          Array.isArray(logs)
            ? logs
            : Array.isArray(
                logs?.items
              )
              ? logs.items
              : [];

        transaction.tokens =
          items
            .map((item: any) => {
              const token =
                item?.token || {};

              const from =
                item?.from?.hash ||
                item?.from ||
                "";

              const to =
                item?.to?.hash ||
                item?.to ||
                "";

              if (
                !from ||
                !to
              ) {
                return null;
              }

              const raw =
                item?.total?.value ||
                item?.value ||
                item?.amount ||
                "0";

              const decimals =
                Number(
                  token?.decimals ??
                    item?.token_decimals ??
                    18
                );

              let amount =
                "0";

              try {
                amount =
                  ethers.formatUnits(
                    String(raw),
                    decimals
                  );
              } catch {}

              return {
                tokenAddress:
                  token?.address ||
                  item?.token?.hash ||
                  item?.address ||
                  "",

                tokenName:
                  token?.name ||
                  "Unknown Token",

                tokenSymbol:
                  token?.symbol ||
                  "TOKEN",

                decimals,

                rawAmount:
                  String(raw),

                amount,

                from,

                to,

                direction:
                  to.toLowerCase() ===
                  address.toLowerCase()
                    ? "in"
                    : "out",
              };
            })
            .filter(Boolean);
      } catch {
        transaction.tokens = [];
      }
    }

    transactions.sort(
      (
        a: any,
        b: any
      ) => {
        const aTime =
          a.timestamp
            ? new Date(
                a.timestamp
              ).getTime()
            : 0;

        const bTime =
          b.timestamp
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

        chainId:
          CHAIN_ID,

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
