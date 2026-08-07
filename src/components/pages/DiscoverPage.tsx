"use client";
import { useState } from "react";

const TOKENS = [
  { id: 1, name: "RobinToken", ticker: "RBTK", price: 0.004821, change: 42.3, mcap: "4.8M", liq: "1.2M", vol: "890K", age: "2d", verified: true, logo: "🟢" },
  { id: 2, name: "ChainPepe", ticker: "CPEPE", price: 0.000182, change: 128.7, mcap: "1.8M", liq: "440K", vol: "2.1M", age: "6h", verified: true, logo: "🐸" },
  { id: 3, name: "RobinAI", ticker: "RAI", price: 0.0921, change: -8.2, mcap: "9.2M", liq: "3.1M", vol: "560K", age: "14d", verified: false, logo: "🤖" },
];

const TABS = ["Trending", "New", "Verified", "Top Volume", "Gainers", "Watchlist"];

export default function DiscoverPage() {
  const [tab, setTab] = useState("Trending");

  return (
    <>
      <div style={{ position: "relative", margin: "12px 18px 0" }}>
        <input placeholder="Search tokens, contracts…" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px 10px 36px", fontSize: 14, color: "#f2f2f7", outline: "none" }} />
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "10px 18px", overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.08)", background: tab === t ? "#00C805" : "none", color: tab === t ? "#000" : "#8e8e93", cursor: "pointer", whiteSpace: "nowrap" }}>{t}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 100px" }}>
        {TOKENS.map(t => (
          <div key={t.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 14, marginBottom: 8, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 28 }}>{t.logo}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name} {t.verified && <span style={{ color: "#00C805", fontSize: 11 }}>✓</span>}</div>
                <div style={{ fontSize: 12, color: "#8e8e93" }}>{t.ticker}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>${t.price < 0.001 ? t.price.toExponential(2) : t.price.toFixed(4)}</div>
                <div style={{ fontSize: 12, color: t.change > 0 ? "#00C805" : "#FF3B30", fontWeight: 600 }}>{t.change > 0 ? "+" : ""}{t.change}%</div>
              </div>
            </div>
            <button style={{ width: "100%", background: "#00C805", color: "#000", border: "none", borderRadius: 10, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Quick Buy</button>
          </div>
        ))}
      </div>
    </>
  );
}
