"use client";
import { useState, useEffect, useRef } from "react";
import type { Token } from "../Terminal";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

const SOURCE_COLORS: Record<string, string> = {
  pons: "#7B61FF", flap: "#FF9500", noxa: "#00C8FF",
  uniswap: "#FF007A", dexscreener: "#00C805", unknown: "#8e8e93",
};

interface FullToken {
  ca: string;
  name: string;
  ticker: string;
  price: number;
  priceFormatted: string;
  change5m: number;
  change1h: number;
  change6h: number;
  change24h: number;
  mcap: number;
  mcapFormatted: string;
  liq: number;
  liqFormatted: string;
  vol24h: number;
  volFormatted: string;
  buys24h: number;
  sells24h: number;
  age: string;
  source: string;
  imageUrl: string;
  website: string;
  telegram: string;
  twitter: string;
  pairAddress: string;
  dexUrl: string;
}

interface LiveTx {
  type: "buy" | "sell";
  wallet: string;
  amount: string;
  value: string;
  ago: string;
  hash: string;
}

const TFS = ["5m","15m","1H","4H","1D","1W"] as const;

function Change({ value, label }: { value: number; label?: string }) {
  const pos = value >= 0;
  if (value === 0) return <span style={{ fontSize: 11, color: T3 }}>—</span>;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: pos ? G : R,
      background: pos ? "rgba(0,200,5,0.1)" : "rgba(255,59,48,0.1)",
      padding: "2px 6px", borderRadius: 6,
    }}>
      {label && <span style={{ opacity: .6, marginRight: 2, fontSize: 10 }}>{label}</span>}
      {pos ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function MiniChart({ priceChange, color }: { priceChange: number; color: string }) {
  const points = Array.from({ length: 30 }, (_, i) => {
    const trend = priceChange / 30;
    const noise = (Math.random() - 0.5) * Math.abs(priceChange) * 0.3;
    return 50 + trend * i + noise;
  });
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const W = 320, H = 80;
  const pts = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((p - min) / range) * H;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pts} L${W},${H} L0,${H} Z`} fill="url(#cg)" />
      <path d={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function TokenDetail({
  token,
  onBack,
  onTrade,
}: {
  token: Token;
  onBack: () => void;
  onTrade: (t: Token, side: "buy" | "sell") => void;
}) {
  const [fullToken, setFullToken] = useState<FullToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [tf, setTf] = useState<typeof TFS[number]>("1H");
  const [tab, setTab] = useState<"overview"|"txns"|"holders">("overview");
  const intervalRef = useRef<NodeJS.Timeout>();

  async function fetchFull() {
    try {
      const res = await fetch(`/api/market/tokens?ca=${token.ca}`);
      const data = await res.json();
      if (data && data.ca) setFullToken(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchFull();
    intervalRef.current = setInterval(fetchFull, 15000);
    return () => clearInterval(intervalRef.current);
  }, [token.ca]);

  const t = fullToken;
  const price = t?.price || token.price;
  const change24h = t?.change24h ?? token.change;
  const pos = change24h >= 0;
  const chartColor = pos ? G : R;
  const source = t?.source || "unknown";
  const sourceColor = SOURCE_COLORS[source] || T3;

  const MOCK_TXS: LiveTx[] = [
    { type: "buy", wallet: "0x3a…f91", amount: "1,842,301", value: "$888", ago: "12s", hash: "0x4a2b" },
    { type: "sell", wallet: "0x9b…c44", amount: "500,000", value: "$241", ago: "35s", hash: "0x9b3c" },
    { type: "buy", wallet: "0x11…ee2", amount: "4,200,000", value: "$2,025", ago: "1m", hash: "0x1122" },
    { type: "buy", wallet: "0x7f…a33", amount: "920,000", value: "$444", ago: "2m", hash: "0x7fab" },
    { type: "sell", wallet: "0x2c…b01", amount: "2,100,000", value: "$1,012", ago: "3m", hash: "0x2c01" },
    { type: "buy", wallet: "0xad…f44", amount: "8,400,000", value: "$4,050", ago: "4m", hash: "0xadf4" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 16px", borderBottom: `1px solid ${B}`, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: S, border: `1px solid ${B}`,
          borderRadius: 9, padding: "6px 12px",
          color: "#f2f2f7", cursor: "pointer", fontSize: 13, flexShrink: 0,
        }}>← Back</button>

        {/* Logo */}
        {loading ? (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: S }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${sourceColor}18`, border: `1.5px solid ${sourceColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: sourceColor, flexShrink: 0 }}>
            {token.ticker?.[0]?.toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t?.name || token.name}
            </span>
            <span style={{
              fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
              background: `${sourceColor}18`, border: `1px solid ${sourceColor}33`,
              color: sourceColor, textTransform: "uppercase", flexShrink: 0,
            }}>{source}</span>
          </div>
          <div style={{ fontSize: 11, color: T2, fontFamily: "monospace" }}>
            {token.ca.slice(0, 8)}…{token.ca.slice(-6)}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {loading ? (
            <div style={{ width: 70, height: 32, background: S, borderRadius: 8 }} />
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{t?.priceFormatted || `$${price.toFixed(6)}`}</div>
              <Change value={change24h} />
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        {/* Chart */}
        <div style={{ background: S, borderBottom: `1px solid ${B}`, padding: "12px 16px" }}>
          {loading ? (
            <div style={{ height: 80, background: "rgba(255,255,255,0.03)", borderRadius: 8 }} />
          ) : (
            <MiniChart priceChange={change24h} color={chartColor} />
          )}
          <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
            {TFS.map(t => (
              <button key={t} onClick={() => setTf(t)} style={{
                background: tf === t ? `${chartColor}18` : "rgba(255,255,255,0.03)",
                border: `1px solid ${tf === t ? chartColor : B}`,
                borderRadius: 7, padding: "4px 10px",
                fontSize: 10, fontWeight: 700,
                color: tf === t ? chartColor : T2, cursor: "pointer",
              }}>{t}</button>
            ))}
            <button style={{
              marginLeft: "auto",
              background: "rgba(255,255,255,0.03)", border: `1px solid ${B}`,
              borderRadius: 7, padding: "4px 10px",
              fontSize: 10, color: T2, cursor: "pointer",
            }} onClick={() => window.open(t?.dexUrl || `https://dexscreener.com/robinhood/${token.ca}`, "_blank")}>
              📊 Full Chart
            </button>
          </div>
        </div>

        {/* Change row */}
        {!loading && t && (
          <div style={{ display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
            <Change value={t.change5m} label="5m" />
            <Change value={t.change1h} label="1h" />
            <Change value={t.change6h} label="6h" />
            <Change value={t.change24h} label="24h" />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", padding: "0 16px 8px", gap: 4 }}>
          {(["overview","txns","holders"] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 100,
              border: `1px solid ${tab === tb ? G : B}`,
              background: tab === tb ? "rgba(0,200,5,0.12)" : "none",
              color: tab === tb ? G : T2, cursor: "pointer", textTransform: "capitalize",
            }}>{tb}</button>
          ))}
        </div>

        <div style={{ padding: "0 16px 110px" }}>
          {/* Overview tab */}
          {tab === "overview" && (
            <>
              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[
                  ["Market Cap", t?.mcapFormatted || token.mcap],
                  ["Liquidity", t?.liqFormatted || token.liq],
                  ["Volume 24H", t?.volFormatted || token.vol],
                  ["Age", t?.age || token.age],
                  ["Buys 24H", t?.buys24h?.toString() || "—"],
                  ["Sells 24H", t?.sells24h?.toString() || "—"],
                ].map(([l, v]) => (
                  <div key={l} style={{
                    background: S, border: `1px solid ${B}`,
                    borderRadius: 12, padding: "10px 12px",
                  }}>
                    <div style={{ fontSize: 10, color: T2, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{v || "—"}</div>
                  </div>
                ))}
              </div>

              {/* Buy/sell ratio bar */}
              {t && t.buys24h + t.sells24h > 0 && (
                <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: G, fontWeight: 600 }}>🟢 Buys {t.buys24h}</span>
                    <span style={{ fontSize: 11, color: R, fontWeight: 600 }}>Sells {t.sells24h} 🔴</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,59,48,0.3)", borderRadius: 100, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 100, background: G,
                      width: `${Math.round(t.buys24h / (t.buys24h + t.sells24h) * 100)}%`,
                      transition: "width .5s",
                    }} />
                  </div>
                </div>
              )}

              {/* Contract */}
              <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: T2, marginBottom: 6 }}>Contract Address</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{ fontSize: 11, color: T2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {token.ca}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(token.ca)}
                    style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${B}`, borderRadius: 7, padding: "4px 10px", fontSize: 11, color: T2, cursor: "pointer", flexShrink: 0 }}
                  >Copy</button>
                </div>
              </div>

              {/* Links */}
              {t && (t.website || t.telegram || t.twitter) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {t.website && (
                    <button onClick={() => window.open(t.website, "_blank")} style={{ background: S, border: `1px solid ${B}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: T2, cursor: "pointer" }}>
                      🌐 Website
                    </button>
                  )}
                  {t.telegram && (
                    <button onClick={() => window.open(t.telegram, "_blank")} style={{ background: S, border: `1px solid ${B}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: T2, cursor: "pointer" }}>
                      ✈️ Telegram
                    </button>
                  )}
                  {t.twitter && (
                    <button onClick={() => window.open(t.twitter, "_blank")} style={{ background: S, border: `1px solid ${B}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: T2, cursor: "pointer" }}>
                      𝕏 Twitter
                    </button>
                  )}
                  <button onClick={() => window.open(t.dexUrl, "_blank")} style={{ background: S, border: `1px solid ${B}`, borderRadius: 9, padding: "7px 12px", fontSize: 12, color: T2, cursor: "pointer" }}>
                    📊 DexScreener
                  </button>
                </div>
              )}
            </>
          )}

          {/* Transactions tab */}
          {tab === "txns" && (
            <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", padding: "10px 14px", borderBottom: `1px solid ${B}` }}>
                <span style={{ flex: 1, fontSize: 10, color: T3, textTransform: "uppercase", letterSpacing: ".05em" }}>Type</span>
                <span style={{ width: 80, fontSize: 10, color: T3, textTransform: "uppercase", letterSpacing: ".05em", textAlign: "right" }}>Amount</span>
                <span style={{ width: 70, fontSize: 10, color: T3, textTransform: "uppercase", letterSpacing: ".05em", textAlign: "right" }}>Value</span>
                <span style={{ width: 40, fontSize: 10, color: T3, textTransform: "uppercase", letterSpacing: ".05em", textAlign: "right" }}>Age</span>
              </div>
              {MOCK_TXS.map((tx, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center",
                  padding: "10px 14px",
                  borderBottom: i < MOCK_TXS.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "none",
                }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, width: "fit-content",
                      padding: "2px 7px", borderRadius: 5,
                      background: tx.type === "buy" ? "rgba(0,200,5,0.12)" : "rgba(255,59,48,0.12)",
                      color: tx.type === "buy" ? G : R,
                    }}>{tx.type.toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: T3, fontFamily: "monospace" }}>{tx.wallet}</span>
                  </div>
                  <div style={{ width: 80, textAlign: "right" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: T2 }}>{tx.amount}</span>
                  </div>
                  <div style={{ width: 70, textAlign: "right" }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{tx.value}</span>
                  </div>
                  <div style={{ width: 40, textAlign: "right" }}>
                    <span style={{ fontSize: 10, color: T3 }}>{tx.ago}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Holders tab */}
          {tab === "holders" && (
            <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden" }}>
              {[
                { label: "🏦 Liquidity Pool", pct: 48.2, color: G },
                { label: "🔥 Burn Wallet", pct: 5.0, color: "#FF9500" },
                { label: "👨‍💻 Dev Wallet", pct: 3.1, color: "#FFD60A" },
                { label: "0x9b2e…f44c", pct: 2.8, color: T2 },
                { label: "0x11ee…2344", pct: 1.9, color: T2 },
                { label: "0x7fab…c012", pct: 1.4, color: T2 },
                { label: "Others", pct: 37.6, color: T3 },
              ].map((h, i, arr) => (
                <div key={h.label} style={{
                  padding: "10px 14px",
                  borderBottom: i < arr.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: h.color === T2 || h.color === T3 ? T2 : h.color, fontFamily: h.label.startsWith("0x") ? "monospace" : undefined }}>{h.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: h.color }}>{h.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 100, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${h.pct}%`, background: h.color, borderRadius: 100 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom buy/sell */}
      <div style={{
        position: "absolute", bottom: 60, left: 0, right: 0,
        padding: "10px 16px",
        background: "rgba(10,10,11,0.96)",
        backdropFilter: "blur(20px)",
        borderTop: `1px solid ${B}`,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={() => onTrade(token, "buy")}
            style={{
              padding: "14px", borderRadius: 13, border: "none",
              background: G, color: "#000",
              fontSize: 15, fontWeight: 800, cursor: "pointer",
            }}
          >🟢 Buy</button>
          <button
            onClick={() => onTrade(token, "sell")}
            style={{
              padding: "14px", borderRadius: 13, border: "none",
              background: R, color: "#fff",
              fontSize: 15, fontWeight: 800, cursor: "pointer",
            }}
          >🔴 Sell</button>
        </div>
      </div>
    </div>
  );
}
