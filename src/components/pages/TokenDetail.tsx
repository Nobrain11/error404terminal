"use client";
import { useState } from "react";
import type { Token } from "../Terminal";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";

const LIVE_TXS = [
  { type: "buy", wallet: "0x3a…f91", amount: "$4,200", ago: "2s" },
  { type: "sell", wallet: "0x9b…c44", amount: "$880", ago: "5s" },
  { type: "buy", wallet: "0x11…ee2", amount: "$12,400", ago: "11s" },
  { type: "buy", wallet: "0x7f…a33", amount: "$320", ago: "18s" },
];

export default function TokenDetail({
  token,
  onBack,
  onTrade,
}: {
  token: Token;
  onBack: () => void;
  onTrade: (t: Token, side: "buy" | "sell") => void;
}) {
  const [tf, setTf] = useState("1H");
  const pos = token.change > 0;

  const points = Array.from({ length: 30 }, (_, i) =>
    token.price * (1 + Math.sin(i * 0.5) * 0.06 + (pos ? i * 0.001 : -i * 0.001))
  );
  const max = Math.max(...points), min = Math.min(...points);
  const W = 360, H = 90;
  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - ((p - min) / (max - min || 1)) * H;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${B}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: S, border: `1px solid ${B}`, borderRadius: 9, padding: "5px 10px", color: "#f2f2f7", cursor: "pointer", fontSize: 12 }}>← Back</button>
        <div style={{ fontSize: 22 }}>{token.logo}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>
            {token.name}
            {token.verified && <span style={{ color: G, fontSize: 11 }}>✓</span>}
          </div>
          <div style={{ fontSize: 11, color: T2, fontFamily: "monospace" }}>{token.ca.slice(0, 10)}…{token.ca.slice(-6)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}</div>
          <div style={{ fontSize: 11, color: pos ? G : R, fontWeight: 600 }}>{pos ? "+" : ""}{token.change}%</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "10px 16px 100px" }}>
        {/* Chart */}
        <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pos ? G : R} stopOpacity="0.25" />
                <stop offset="100%" stopColor={pos ? G : R} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${pathD} L${W},${H} L0,${H} Z`} fill="url(#cg)" />
            <path d={pathD} fill="none" stroke={pos ? G : R} strokeWidth="1.5" />
          </svg>
          <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
            {["1m", "5m", "15m", "1H", "4H", "1D", "1W"].map(t => (
              <button key={t} onClick={() => setTf(t)} style={{
                background: tf === t ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${tf === t ? "rgba(0,200,5,0.4)" : B}`,
                borderRadius: 7, padding: "3px 8px", fontSize: 10, fontWeight: 600,
                color: tf === t ? G : T2, cursor: "pointer",
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[
            ["Market Cap", `$${token.mcap}`],
            ["Liquidity", `$${token.liq}`],
            ["Volume 24H", `$${token.vol}`],
            ["Holders", token.holders.toLocaleString()],
            ["Age", token.age],
            ["Verified", token.verified ? "Yes ✓" : "No"],
          ].map(([l, v]) => (
            <div key={l} style={{ background: S, border: `1px solid ${B}`, borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: T2, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Live feed */}
        <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Live Activity</div>
          {LIVE_TXS.map((tx, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, marginBottom: 8, borderBottom: i < LIVE_TXS.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: tx.type === "buy" ? "rgba(0,200,5,0.12)" : "rgba(255,59,48,0.12)", color: tx.type === "buy" ? G : R }}>
                {tx.type.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: T2, fontFamily: "monospace", flex: 1 }}>{tx.wallet}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{tx.amount}</span>
              <span style={{ fontSize: 10, color: "#48484a" }}>{tx.ago}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <button onClick={() => onTrade(token, "buy")} style={{ padding: "13px", borderRadius: 12, border: "none", background: G, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🟢 Buy
          </button>
          <button onClick={() => onTrade(token, "sell")} style={{ padding: "13px", borderRadius: 12, border: "none", background: R, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🔴 Sell
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {["📈 Limit", "🎯 Snipe", "📤 Share"].map(a => (
            <button key={a} style={{ padding: "10px", borderRadius: 12, border: `1px solid ${B}`, background: S, color: "#f2f2f7", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
