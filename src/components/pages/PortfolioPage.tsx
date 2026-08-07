"use client";
import { useState } from "react";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

const TABS = ["Holdings", "Positions", "PnL", "History", "Wallets"];

const ASSETS = [
  { logo: "🟢", name: "RobinToken", ticker: "RBTK", amount: "142,000", value: 684.58, entry: 0.0031, price: 0.004821, change: 55.5, pnl: 228.82 },
  { logo: "💎", name: "RobinFi", ticker: "RIFI", amount: "88.4", value: 189.22, entry: 1.88, price: 2.14, change: 13.8, pnl: 22.98 },
  { logo: "🐸", name: "ChainPepe", ticker: "CPEPE", amount: "5,200,000", value: 946.40, entry: 0.000244, price: 0.000182, change: -25.4, pnl: -322.40 },
];

const HISTORY = [
  { type: "buy", token: "RBTK", amount: "0.1 ETH", value: "$420", time: "2h ago", status: "confirmed" },
  { type: "sell", token: "CPEPE", amount: "1,000,000", value: "$182", time: "5h ago", status: "confirmed" },
  { type: "buy", token: "RIFI", amount: "0.05 ETH", value: "$107", time: "1d ago", status: "confirmed" },
  { type: "buy", token: "RBTK", amount: "0.2 ETH", value: "$840", time: "2d ago", status: "confirmed" },
];

export default function PortfolioPage() {
  const [tab, setTab] = useState("Holdings");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.02em" }}>$1,820.20</div>
        <div style={{ fontSize: 11, color: T2, marginTop: 4, fontFamily: "monospace" }}>0x3a7f…9b44 · Robinhood Chain</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
          {[["Today", "+$148.40", G], ["Total PnL", "-$70.60", R], ["Win Rate", "62%", "#f2f2f7"]].map(([l, v, c]) => (
            <div key={l} style={{ background: S, border: `1px solid ${B}`, borderRadius: 10, padding: "8px" }}>
              <div style={{ fontSize: 9, color: T3, textTransform: "uppercase", letterSpacing: ".05em" }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {["Deposit", "Withdraw", "Send", "Receive"].map(a => (
            <button key={a} style={{
              flex: 1, background: S, border: `1px solid ${B}`,
              borderRadius: 10, padding: "8px 4px", fontSize: 10, fontWeight: 600,
              color: T2, cursor: "pointer",
            }}>{a}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "0 16px 8px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 100,
            border: `1px solid ${tab === t ? G : B}`,
            background: tab === t ? "rgba(0,200,5,0.12)" : "none",
            color: tab === t ? G : T2, cursor: "pointer", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 100px", scrollbarWidth: "none" }}>
        {/* Holdings */}
        {tab === "Holdings" && ASSETS.map((a, i) => (
          <div key={i} style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 26 }}>{a.logo}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: T2 }}>{a.amount} {a.ticker}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>${a.value.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: a.change > 0 ? G : R, fontWeight: 600 }}>
                  {a.change > 0 ? "+" : ""}{a.change}%
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, fontSize: 10, color: T2, marginBottom: 8 }}>
              <span>Avg ${a.entry < 0.001 ? a.entry.toExponential(2) : a.entry.toFixed(4)}</span>
              <span>·</span>
              <span style={{ color: a.pnl > 0 ? G : R, fontWeight: 600 }}>
                {a.pnl > 0 ? "+" : ""}${a.pnl.toFixed(2)} PnL
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ flex: 1, background: G, border: "none", borderRadius: 9, padding: "7px", fontSize: 11, fontWeight: 700, color: "#000", cursor: "pointer" }}>Buy</button>
              <button style={{ flex: 1, background: R, border: "none", borderRadius: 9, padding: "7px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Sell</button>
              <button style={{ width: 32, background: S, border: `1px solid ${B}`, borderRadius: 9, fontSize: 13, cursor: "pointer" }}>📊</button>
            </div>
          </div>
        ))}

        {/* PnL */}
        {tab === "PnL" && (
          <div>
            {[
              ["Daily PnL", "+$148.40", G],
              ["Weekly PnL", "+$320.10", G],
              ["Monthly PnL", "-$70.60", R],
              ["Total PnL", "-$70.60", R],
              ["Best Trade", "+$412.20 RBTK", G],
              ["Worst Trade", "-$322.40 CPEPE", R],
              ["Win Rate", "62%", "#f2f2f7"],
              ["Total Trades", "24", "#f2f2f7"],
              ["Avg Buy", "$284.10", "#f2f2f7"],
              ["Avg Sell", "$248.90", "#f2f2f7"],
              ["Total Fees", "$12.40", T2],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <span style={{ fontSize: 13, color: T2 }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {tab === "History" && HISTORY.map((tx, i) => (
          <div key={i} style={{ background: S, border: `1px solid ${B}`, borderRadius: 12, padding: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
              background: tx.type === "buy" ? "rgba(0,200,5,0.12)" : "rgba(255,59,48,0.12)",
              color: tx.type === "buy" ? G : R,
            }}>{tx.type.toUpperCase()}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.token}</div>
              <div style={{ fontSize: 11, color: T2 }}>{tx.amount}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.value}</div>
              <div style={{ fontSize: 10, color: T3 }}>{tx.time}</div>
            </div>
          </div>
        ))}

        {/* Wallets */}
        {tab === "Wallets" && (
          <div>
            {[{ name: "Wallet 1", addr: "0x3a7f…9b44", bal: "$1,820.20", active: true }].map((w, i) => (
              <div key={i} style={{ background: S, border: `1px solid ${w.active ? "rgba(0,200,5,0.3)" : B}`, borderRadius: 14, padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,200,5,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👛</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{w.name} {w.active && <span style={{ fontSize: 10, color: G }}>● Active</span>}</div>
                    <div style={{ fontSize: 11, color: T2, fontFamily: "monospace" }}>{w.addr}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{w.bal}</div>
                </div>
              </div>
            ))}
            <button style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${B}`, background: S, color: "#f2f2f7", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + Add Wallet
            </button>
          </div>
        )}

        {/* Positions */}
        {tab === "Positions" && ASSETS.map((a, i) => (
          <div key={i} style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{a.logo}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.ticker}</div>
                  <div style={{ fontSize: 11, color: T2 }}>{a.amount}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>${a.value.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: a.pnl > 0 ? G : R, fontWeight: 700 }}>
                  {a.pnl > 0 ? "+" : ""}${a.pnl.toFixed(2)}
                </div>
              </div>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.abs(a.change)}%`, background: a.pnl > 0 ? G : R, borderRadius: 100 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
