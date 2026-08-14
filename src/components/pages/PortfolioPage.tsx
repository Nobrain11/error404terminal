"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TokenHolding = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  amount: string;
  rawBalance?: string;
  priceUsd: string;
  valueUsd: string;
  allocation: string;
  verified?: boolean;
};

type PortfolioData = {
  success?: boolean;
  address: string;
  network?: string;
  chainId?: number;

  balance?: string;
  balanceUsd?: string;

  eth?: {
    balance: string;
    priceUsd: string;
    valueUsd: string;
    allocation: string;
  };

  ethBalance?: string;
  ethPrice?: string;
  ethValueUsd?: string;

  tokenValueUsd?: string;
  totalValueUsd?: string;
  tokenCount?: number;

  tokens?: TokenHolding[];

  updatedAt?: string;
  error?: string;
};

function formatUsd(value: string | number | undefined) {
  const n = Number(value || 0);

  if (!Number.isFinite(n)) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatAmount(value: string | number | undefined) {
  const n = Number(value || 0);

  if (!Number.isFinite(n)) return "0";

  if (n === 0) return "0";

  if (n < 0.000001) {
    return n.toExponential(3);
  }

  if (n < 1) {
    return n.toLocaleString("en-US", {
      maximumFractionDigits: 8,
    });
  }

  return n.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

function shortenAddress(address: string) {
  if (!address) return "";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function TokenIcon({
  token,
}: {
  token: TokenHolding;
}) {
  const [failed, setFailed] = useState(false);

  /*
   * DexScreener doesn't guarantee a logo for every token.
   * Use a clean symbol fallback instead of broken-image UI.
   */
  if (failed) {
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-bold text-[#f2f2f7]"
      >
        {token.symbol?.slice(0, 2) || "?"}
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08]">
      <img
        src={`https://dd.dexscreener.com/ds-data/tokens/robinhood/${token.address}.png`}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function PortfolioPage() {
  const [address, setAddress] = useState("");
  const [portfolio, setPortfolio] =
    useState<PortfolioData | null>(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPortfolio = useCallback(
    async (
      walletAddress: string,
      isRefresh = false
    ) => {
      if (!walletAddress) {
        setPortfolio(null);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await fetch(
          `/api/wallet/balance?address=${encodeURIComponent(
            walletAddress
          )}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || data?.error) {
          throw new Error(
            data?.error ||
              "Unable to load wallet portfolio."
          );
        }

        setPortfolio(data);
      } catch (err: any) {
        console.error(
          "Portfolio load failed:",
          err
        );

        setError(
          err?.message ||
            "Unable to load portfolio."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /*
   * Try to use the currently selected wallet from the
   * existing application storage.
   *
   * We deliberately support several existing names so
   * this page doesn't force a wallet architecture change.
   */
  useEffect(() => {
    try {
      const candidates = [
        localStorage.getItem("walletAddress"),
        localStorage.getItem("selectedWallet"),
        localStorage.getItem("activeWallet"),
      ];

      const selected = candidates.find(
        (value) =>
          value &&
          /^0x[a-fA-F0-9]{40}$/.test(value)
      );

      if (selected) {
        setAddress(selected);
        loadPortfolio(selected);
      }
    } catch {
      // localStorage may be unavailable.
    }
  }, [loadPortfolio]);

  /*
   * Refresh automatically every 15 seconds.
   */
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      loadPortfolio(address, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [address, loadPortfolio]);

  const tokens = useMemo(
    () => portfolio?.tokens || [],
    [portfolio]
  );

  const totalValue =
    portfolio?.totalValueUsd ||
    portfolio?.balanceUsd ||
    "0";

  const ethBalance =
    portfolio?.eth?.balance ||
    portfolio?.ethBalance ||
    portfolio?.balance ||
    "0";

  const ethPrice =
    portfolio?.eth?.priceUsd ||
    portfolio?.ethPrice ||
    "0";

  const ethValue =
    portfolio?.eth?.valueUsd ||
    portfolio?.ethValueUsd ||
    "0";

  const openToken = (token: TokenHolding) => {
    /*
     * Preserve the terminal's existing URL-based navigation
     * convention without forcing a new routing system.
     */
    window.location.href = `/terminal?token=${token.address}`;
  };

  const connectWallet = () => {
    /*
     * Keep this compatible with the existing wallet UI.
     * If a wallet address is already available, use it.
     */
    const entered = window.prompt(
      "Enter your Robinhood Chain wallet address"
    );

    if (
      entered &&
      /^0x[a-fA-F0-9]{40}$/.test(
        entered.trim()
      )
    ) {
      const normalized = entered.trim();

      try {
        localStorage.setItem(
          "walletAddress",
          normalized
        );
      } catch {}

      setAddress(normalized);
      loadPortfolio(normalized);
    }
  };

  if (!address) {
    return (
      <div className="min-h-full px-4 pb-24 pt-5 text-[#f2f2f7]">
        <div className="mb-6">
          <div className="text-xs font-medium uppercase tracking-wider text-[#8e8e93]">
            Portfolio
          </div>

          <h1 className="mt-1 text-2xl font-semibold">
            Your assets
          </h1>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00C805]/10 text-2xl">
            ◇
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            Connect a wallet
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#8e8e93]">
            Connect or enter a Robinhood Chain wallet
            to view real ETH and token balances.
          </p>

          <button
            type="button"
            onClick={connectWallet}
            className="mt-5 w-full rounded-[10px] bg-[#00C805] px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 pb-24 pt-5 text-[#f2f2f7]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-[#8e8e93]">
            Portfolio
          </div>

          <h1 className="mt-1 text-2xl font-semibold">
            Your assets
          </h1>

          <div className="mt-1 font-mono text-xs text-[#48484a]">
            {shortenAddress(address)}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadPortfolio(address, true)
          }
          disabled={refreshing}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#8e8e93] transition hover:bg-white/[0.08] disabled:opacity-40"
          aria-label="Refresh portfolio"
        >
          <span
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          >
            ↻
          </span>
        </button>
      </div>

      {/* Total value */}
      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="text-xs text-[#8e8e93]">
          Total portfolio value
        </div>

        {loading ? (
          <div className="mt-3 h-9 w-40 animate-pulse rounded bg-white/[0.08]" />
        ) : (
          <div className="mt-2 text-3xl font-semibold tracking-tight">
            {formatUsd(totalValue)}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <div className="text-[11px] text-[#8e8e93]">
              ETH
            </div>

            <div className="mt-1 text-sm font-semibold">
              {formatAmount(ethBalance)}
            </div>

            <div className="mt-1 text-xs text-[#8e8e93]">
              {formatUsd(ethValue)}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.04] p-3">
            <div className="text-[11px] text-[#8e8e93]">
              ETH price
            </div>

            <div className="mt-1 text-sm font-semibold">
              {formatUsd(ethPrice)}
            </div>

            <div className="mt-1 text-xs text-[#8e8e93]">
              Robinhood Chain
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-[#FF3B30]/20 bg-[#FF3B30]/10 p-4">
          <div className="text-sm font-medium text-[#FF3B30]">
            Portfolio unavailable
          </div>

          <div className="mt-1 text-xs leading-5 text-[#8e8e93]">
            {error}
          </div>

          <button
            type="button"
            onClick={() =>
              loadPortfolio(address)
            }
            className="mt-3 rounded-lg bg-white/[0.08] px-3 py-2 text-xs font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Holdings */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">
            Holdings
          </div>

          <div className="text-xs text-[#8e8e93]">
            {portfolio?.tokenCount ??
              tokens.length}{" "}
            tokens
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[72px] animate-pulse rounded-xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center">
            <div className="text-sm font-medium">
              No token holdings found
            </div>

            <div className="mt-1 text-xs leading-5 text-[#8e8e93]">
              ERC-20 tokens held by this wallet will
              appear here automatically.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <button
                key={token.address}
                type="button"
                onClick={() =>
                  openToken(token)
                }
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]"
              >
                <div className="flex items-center gap-3">
                  <TokenIcon token={token} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">
                        {token.symbol}
                      </span>

                      {token.verified && (
                        <span className="text-[10px] text-[#00C805]">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 truncate text-xs text-[#8e8e93]">
                      {token.name}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatUsd(
                        token.valueUsd
                      )}
                    </div>

                    <div className="mt-0.5 text-xs text-[#8e8e93]">
                      {formatAmount(
                        token.amount
                      )}{" "}
                      {token.symbol}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[10px] text-[#48484a]">
                    {shortenAddress(
                      token.address
                    )}
                  </div>

                  <div className="text-[10px] text-[#8e8e93]">
                    {token.allocation || "0.00"}%
                  </div>
                </div>

                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-[#00C805]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            token.allocation || 0
                          )
                        )
                      )}%`,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer status */}
      <div className="mt-6 text-center text-[10px] text-[#48484a]">
        {portfolio?.updatedAt
          ? `Updated ${new Date(
              portfolio.updatedAt
            ).toLocaleTimeString()}`
          : "Waiting for portfolio data"}
      </div>
    </div>
  );
}
