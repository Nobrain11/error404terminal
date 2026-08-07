"use client";
import { useState } from "react";
import type { Token } from "../Terminal";

const TOKENS: Token[] = [
  { id: 1, name: "RobinToken", ticker: "RBTK", price: 0.004821, change: 42.3, mcap: "4.8M", liq: "1.2M", vol: "890K", age: "2d", holders: 3420, verified: true, logo: "🟢", ca: "0x1234567890abcdef1234567890abcdef12345678" },
  { id: 2, name: "ChainPepe", ticker: "CPEPE", price: 0.000182, change: 128.7, mcap: "1.8M", liq: "440K", vol: "2.1M", age: "6h", holders: 8821, verified: true, logo: "🐸", ca: "0x2234567890abcdef1234567890abcdef12345678" },
  { id: 3, name: "RobinAI", ticker: "RAI", price: 0.0921, change: -8.2, mcap: "9.2M", liq: "3.1M", vol: "560K", age: "14d", holders: 12040, verified: false, logo: "🤖", ca: "0x3234567890abcdef1234567890abcdef12345678" },
  { id: 4, name: "MoonBase", ticker: "MBASE", price: 0.00071, change: 67.1, mcap: "710K", liq: "210K", vol: "320K", age: "18h", holders: 1980, verified: false, logo: "🌙", ca: "0x4234567890abcdef1234567890abcdef12345678" },
  { id: 5, name: "RobinFi", ticker: "RIFI", price: 2.14, change: 11.4, mcap: "21.4M", liq: "8.8M", vol: "4.2M", age: "30d", holders: 29400, verified: true, logo: "💎", ca: "0x5234567890abcdef1234567890abcdef12345678" },
  { id: 6, name: "SnipeBot", ticker: "SNIPE", price: 0.00334, change: 88.0, mcap: "3.3M", liq: "990K", vol: "1.1M", age: "1d", holders: 6710, verified: true, logo: "🎯", ca: "0x6234567890abcdef1234567890abcdef12345678" },
];

const TABS = ["Trending", "New", "Verified", "Top Volume", "Gainers", "Watchlist"];

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

export default function DiscoverPage({ onSelectToken }: { onSelectToken: (t: Token) => void }) {
  const [tab, setTab] = useState("Trending");
  const [search, setSearch] = useState("");

  const filtered = TOKENS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.ticker.toLowerCase().includes(search.toLowerCase()) ||
    t.ca.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Search */}
      <div style={{ position: "relative", margin: "10px 16px 0" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T3 }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tokens, CA, wallets…"
          style={{
            width: "100%", background: S, border: `1px solid ${B}`,
            borderRadius: 12, padding: "9px 12px 9px 34px",
            fontSize: 13, color: "#f2f2f7", outline: "none",
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "8px 16px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px",
            borderRadius: 100, border: `1px solid ${tab === t ? G : B}`,
            background: tab === t ? "rgba(0,200,5,0.12)" : "none",
            color: tab === t ? G : T2, cursor: "pointer", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>

      {/* Hot row */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 10px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
        {TOKENS.slice(0, 4).map(t => (
          <div key={t.id} onClick={() => onSelectToken(t)} style={{
            background: S, border: `1px solid ${B}`, borderRadius: 12,
            padding: "8px 12px", cursor: "pointer", flexShrink: 0, minWidth: 80,
          }}>
            <div style={{ fontSize: 20, marginBottom: 3 }}>{t.logo}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{t.ticker}</div>
            <div style={{ fontSize: 10, color: t.change > 0 ? G : R, fontWeight: 600 }}>
              {t.change > 0 ? "+" : ""}{t.change}%
            </div>
          </div>
        ))}
      </div>

      {/* Token list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 100px", scrollbarWidth: "none" }}>
        {filtered.map(t => (
          <div key={t.id} onClick={() => onSelectToken(t)} style={{
            background: S, border: `1px solid ${B}`, borderRadius: 14,
            padding: 12, marginBottom: 8, cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 26, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", borderRadius: "50%", flexShrink: 0 }}>{t.logo}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                  {t.name}
                  {t.verified && <span style={{ color: G, fontSize: 10 }}>✓</span>}
                </div>
                <div style={{ fontSize: 11, color: T2 }}>{t.ticker}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  ${t.price < 0.001 ? t.price.toExponential(2) : t.price.toFixed(4)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.change > 0 ? G : R }}>
                  {t.change > 0 ? "+" : ""}{t.change}%
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginBottom: 8 }}>
              {[["MCap", `$${t.mcap}`], ["Liq", `$${t.liq}`], ["Vol", `$${t.vol}`], ["Age", t.age]].map(([l, v]) => (
                <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "4px 6px" }}>
                  <div style={{ fontSize: 9, color: T3, textTransform: "uppercase", letterSpacing: ".04em" }}>{l}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={e => { e.stopPropagation(); onSelectToken(t); }} style={{
                flex: 1, background: G, color: "#000", border: "none",
                borderRadius: 9, padding: "7px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>Quick Buy</button>
              <button onClick={e => e.stopPropagation()} style={{
                width: 32, background: S, border: `1px solid ${B}`,
                borderRadius: 9, fontSize: 13, cursor: "pointer",
              }}>⭐</button>
              <button onClick={e => e.stopPropagation()} style={{
                width: 32, background: S, border: `1px solid ${B}`,
                borderRadius: 9, fontSize: 13, cursor: "pointer",
              }}>🔍</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
