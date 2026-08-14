"use client";

import { useCallback, useEffect, useState } from "react";

type Transaction = {
  hash: string;
  shortHash: string;
  from: string;
  to: string;
  fromShort: string;
  toShort: string;
  direction: "in" | "out";
  type: string;
  status: string;
  valueEth: string;
  feeEth: string;
  blockNumber: number | null;
  timestamp: string | null;
  explorerUrl: string;
};

type ResponseData = {
  success?: boolean;
  transactions?: Transaction[];
  error?: string;
};

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";

function shorten(value: string) {
  if (!value) return "";

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatEth(value: string) {
  const n = Number(value || 0);

  if (!Number.isFinite(n)) return "0 ETH";

  if (n === 0) return "0 ETH";

  return `${n.toLocaleString("en-US", {
    maximumFractionDigits: 6,
  })} ETH`;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown time";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTypeLabel(tx: Transaction) {
  const type = String(tx.type || "").toLowerCase();

  if (
    type.includes("swap") ||
    type.includes("swapexact")
  ) {
    return "SWAP";
  }

  if (
    type.includes("transfer") ||
    type.includes("erc20")
  ) {
    return "TRANSFER";
  }

  if (tx.direction === "in") {
    return "RECEIVED";
  }

  if (tx.direction === "out") {
    return "SENT";
  }

  return "TRANSACTION";
}

export default function ActivityPage() {
  const [address, setAddress] = useState("");
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(
    async (
      walletAddress: string,
      refresh = false
    ) => {
      if (!walletAddress) return;

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await fetch(
          `/api/wallet/transactions?address=${encodeURIComponent(
            walletAddress
          )}&limit=100`,
          {
            cache: "no-store",
          }
        );

        const data: ResponseData =
          await response.json();

        if (!response.ok || data.error) {
          throw new Error(
            data.error ||
              "Unable to load activity."
          );
        }

        setTransactions(
          Array.isArray(data.transactions)
            ? data.transactions
            : []
        );
      } catch (err: any) {
        console.error(
          "Activity load failed:",
          err
        );

        setError(
          err?.message ||
            "Unable to load activity."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

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
        loadTransactions(selected);
      }
    } catch {}
  }, [loadTransactions]);

  useEffect(() => {
    if (!address) return;

    const timer = setInterval(() => {
      loadTransactions(address, true);
    }, 15000);

    return () => clearInterval(timer);
  }, [address, loadTransactions]);

  if (!address) {
    return (
      <div
        style={{
          flex: 1,
          padding: "24px 16px",
          color: "#f2f2f7",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: T2,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Activity
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          Transaction history
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 24,
            borderRadius: 16,
            border: `1px solid ${B}`,
            background: S,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 36,
              marginBottom: 10,
            }}
          >
            ◇
          </div>

          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Connect a wallet
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: T2,
              lineHeight: 1.5,
            }}
          >
            Connect a wallet to view
            on-chain activity.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        color: "#f2f2f7",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 10px",
          borderBottom: `1px solid ${B}`,
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: T2,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Activity
          </div>

          <div
            style={{
              marginTop: 3,
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Transactions
          </div>

          <div
            style={{
              marginTop: 2,
              fontSize: 10,
              color: "#48484a",
              fontFamily: "monospace",
            }}
          >
            {shorten(address)}
          </div>
        </div>

        <button
          onClick={() =>
            loadTransactions(address, true)
          }
          disabled={refreshing}
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            border: `1px solid ${B}`,
            background: S,
            color: T2,
            cursor: "pointer",
            opacity: refreshing ? 0.4 : 1,
          }}
        >
          <span
            style={{
              display: "inline-block",
              animation: refreshing
                ? "spin 1s linear infinite"
                : "none",
            }}
          >
            ↻
          </span>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 16px 100px",
          scrollbarWidth: "none",
        }}
      >
        {error && (
          <div
            style={{
              marginBottom: 10,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,59,48,0.2)",
              background:
                "rgba(255,59,48,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: R,
              }}
            >
              Could not load activity
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: T2,
              }}
            >
              {error}
            </div>

            <button
              onClick={() =>
                loadTransactions(address)
              }
              style={{
                marginTop: 9,
                padding: "6px 10px",
                borderRadius: 7,
                border: `1px solid ${B}`,
                background: S,
                color: "#f2f2f7",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                style={{
                  height: 78,
                  marginBottom: 8,
                  borderRadius: 14,
                  background: S,
                  border: `1px solid ${B}`,
                  opacity:
                    1 - item * 0.1,
                }}
              />
            ))}
          </>
        ) : transactions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "55px 24px",
            }}
          >
            <div
              style={{
                fontSize: 40,
                marginBottom: 10,
              }}
            >
              ◷
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              No transactions
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: T2,
                lineHeight: 1.5,
              }}
            >
              Transactions made by this
              wallet will appear here.
            </div>
          </div>
        ) : (
          transactions.map((tx) => {
            const incoming =
              tx.direction === "in";

            const color =
              incoming ? G : R;

            const label =
              getTypeLabel(tx);

            return (
              <div
                key={tx.hash}
                style={{
                  background: S,
                  border: `1px solid ${B}`,
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: incoming
                        ? "rgba(0,200,5,0.1)"
                        : "rgba(255,59,48,0.1)",
                      color,
                      fontSize: 19,
                    }}
                  >
                    {incoming ? "↓" : "↑"}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 10,
                        color: T2,
                      }}
                    >
                      {formatDate(
                        tx.timestamp
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color,
                      }}
                    >
                      {incoming
                        ? "+"
                        : "-"}
                      {formatEth(
                        tx.valueEth
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 10,
                        color: T2,
                      }}
                    >
                      {tx.status ===
                      "success"
                        ? "Confirmed"
                        : tx.status}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 10,
                    marginTop: 10,
                    paddingTop: 9,
                    borderTop: `1px solid ${B}`,
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: T2,
                      }}
                    >
                      {incoming
                        ? "FROM"
                        : "TO"}
                    </div>

                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        fontFamily:
                          "monospace",
                        color:
                          "#636366",
                      }}
                    >
                      {incoming
                        ? tx.fromShort
                        : tx.toShort}
                    </div>
                  </div>

                  <a
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      alignSelf: "end",
                      fontSize: 10,
                      color: G,
                      textDecoration:
                        "none",
                    }}
                  >
                    View on explorer ↗
                  </a>
                </div>

                {Number(tx.feeEth) >
                  0 && (
                  <div
                    style={{
                      marginTop: 7,
                      fontSize: 9,
                      color: "#48484a",
                    }}
                  >
                    Network fee:{" "}
                    {formatEth(
                      tx.feeEth
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
