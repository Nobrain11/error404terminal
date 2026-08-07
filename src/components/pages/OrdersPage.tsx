"use client";
import { useState } from "react";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

const TABS = ["Active", "Filled", "Buy Limits", "Sell Limits", "Stop Loss", "Take Profit"];

const ORDERS = [
  { type: "buy_limit", token: "RBTK", logo: "🟢", target: "$0.003", amount: "0.1 ETH", status: "active", filled: 0 },
  { type: "sell_limit", token: "RIFI", logo: "💎", target: "$2.50", amount: "50%", status: "active", filled: 0 },
  { type: "stop_loss", token: "CPEPE", logo: "🐸", target: "$0.00015", amount: "100%", status: "active", filled: 0 },
  { type: "take_profit", token: "RBTK", logo: "🟢", target: "$0.008", amount: "25%", status: "filled", filled: 100 },
];

export default function OrdersPage() {
  const [tab, setTab] = useState("Active");

  const filtered = ORDERS.filter(o => {
    if (tab === "Active") return o.status === "active";
    if (tab === "Filled") return o.status === "filled";
    if (tab === "Buy Limits") return o.type === "buy_limit";
    if (tab === "Sell Limits") return o.type === "sell_limit";
    if (tab === "Stop Loss") return o.type === "stop_loss";
    if (tab === "Take Profit") return o.type === "take_profit";
    return true;
  });

  const typeLabel: Record<string, string> = {
    buy_limit: "BUY LIMIT",
    sell_limit: "SELL LIMIT",
    stop_loss: "STOP LOSS",
    take_profit: "TAKE PROFIT",
  };

  const typeColor: Record<string, string> = {
    buy_limit: G,
    sell_limit: R,
    stop_loss: R,
    take_profit: G,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ padding: "0 16px 8px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 4, paddingTop: 10 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 100,
              border: `1px solid ${tab === t ? G : B}`,
              background: tab === t ? "rgba(0,200,5,0.12)" : "none",
              color: tab === t ? G : T2, cursor: "pointer", whiteSpace: "nowrap",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 100px", scrollbarWidth: "none" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎯</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No Orders</div>
            <div style={{ fontSize: 12, color: T2 }}>Set a limit order from the Trade tab.</div>
          </div>
        )}
        {filtered.map((o, i) => (
          <div key={i} style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{o.logo}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{o.token}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: typeColor[o.type] }}>{typeLabel[o.type]}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>@ {o.target}</div>
                <div style={{ fontSize: 11, color: T2 }}>{o.amount}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                background: o.status === "filled" ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.06)",
                color: o.status === "filled" ? G : T2,
              }}>
                {o.status === "filled" ? "✅ FILLED" : "⏳ ACTIVE"}
              </span>
              {o.status === "active" && (
                <button style={{ fontSize: 11, color: R, background: "rgba(255,59,48,0.1)", border: `1px solid rgba(255,59,48,0.2)`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}

        <button style={{ width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${G}`, background: "rgba(0,200,5,0.08)", color: G, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
          + New Order
        </button>
      </div>
    </div>
  );
}
