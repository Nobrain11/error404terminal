"use client";
import { useState, useEffect } from "react";
import type { Token } from "../Terminal";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

const TABS = ["Trending", "New", "Top Volume", "Gainers", "Losers"];

function tokenEmoji(symbol: string): string {
  const map: Record<string, string> = {
    CASHCAT: "🐱", TROLL: "🧌", BAG: "💰", CCC: "🐸",
    POOLSV2: "💎", SWAPPY: "🔄", LILUNI: "🌸", TOPBLAST: "🚀",
  };
  return map[symbol?.toUpperCase()] || "🪙";
}

export default function DiscoverPage({ onSelectToken }: { onSelectToken: (t: Token) => void }) {
  const [tab, setTab] = useState("Trending");
  const [search, setSearch] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchTokens();
    const interval = setInterval(fetchTokens, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  async function fetchTokens() {
    try {
      setLoading(true);
      const res = await fetch("/api/market/tokens");
      const data = await res.json();
      if (Array.isArray(data)) {
        let sorted = [...data];
        if (tab === "New") sorted.sort((a, b) => b.age?.localeCompare?.(a.age) || 0);
        if (tab === "Top Volume") sorted.sort((a, b) => parseFloat(b.vol) - parseFloat(a.vol));
        if (tab === "Gainers") sorted.sort((a, b) => b.change - a.change);
        if (tab === "Losers") sorted.sort((a, b) => a.change - b.change);
        setTokens(sorted.map((t: any, i: number) => ({
          id: i,
          name: t.name,
          ticker: t.ticker,
          price: t.price,
          change: parseFloat(t.change) || 0,
          mcap: t.mcap,
          liq: t.liq,
          vol: t.vol,
          age: t.age,
          holders: t.holders || 0,
          verified: t.verified || false,
          logo: tokenEmoji(t.ticker),
          ca: t.ca,
        })));
      }
    } catch {
      console.error("Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(q: string) {
    setSearch(q);
    if (!q) { fetchTokens(); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/market/tokens?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTokens(data.map((t: any, i: number) => ({
          id: i,
          name: t.name,
          ticker: t.ticker,
          price: t.price,
          change: parseFloat(t.change) || 0,
          mcap: t.mcap,
          liq: t.liq,
          vol: t.vol,
          age: t.age,
          holders: t.holders || 0,
          verified: false,
          logo: tokenEmoji(t.ticker),
          ca: t.ca,
        })));
      }
    } catch {}
    setSearching(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Search */}
      <div style={{ position: "relative", margin: "10px 16px 0" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T3 }}>🔍</span>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search tokens, CA…"
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

      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px 8px" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: G, animation: "pulse 1.5s infinite" }} />
        <span style={{ fontSize: 11, color: T2 }}>Live · Robinhood Chain · DexScreener</span>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
      </div>

      {/* Token list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 100px", scrollbarWidth: "none" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                height: 120, borderRadius: 14,
                background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }} />
            ))}
            <style>{`@keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }`}</style>
          </div>
        )}

        {!loading && tokens.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No tokens found</div>
            <div style={{ fontSize: 12, color: T2 }}>Try a different search</div>
          </div>
        )}

        {!loading && tokens.map(t => (
          <div key={t.id} onClick={() => onSelectToken(t)} style={{
            background: S, border: `1px solid ${B}`, borderRadius: 14,
            padding: 12, marginBottom: 8, cursor: "pointer",
            transition: "border-color .15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>{t.logo}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  {t.verified && <span style={{ color: G, fontSize: 10, flexShrink: 0 }}>✓</span>}
                </div>
                <div style={{ fontSize: 11, color: T2 }}>{t.ticker}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  ${t.price < 0.0001 ? t.price.toExponential(2) : t.price < 1 ? t.price.toFixed(6) : t.price.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.change >= 0 ? G : R }}>
                  {t.change >= 0 ? "+" : ""}{typeof t.change === "number" ? t.change.toFixed(1) : t.change}%
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginBottom: 8 }}>
              {[
                ["MCap", t.mcap],
                ["Liq", t.liq],
                ["Vol", t.vol],
                ["Age", t.age],
              ].map(([l, v]) => (
                <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "4px 6px" }}>
                  <div style={{ fontSize: 9, color: T3, textTransform: "uppercase", letterSpacing: ".04em" }}>{l}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={e => { e.stopPropagation(); onSelectToken(t); }}
                style={{
                  flex: 1, background: G, color: "#000", border: "none",
                  borderRadius: 9, padding: "7px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}
              >Quick Buy</button>
              <button
                onClick={e => e.stopPropagation()}
                style={{ width: 32, background: S, border: `1px solid ${B}`, borderRadius: 9, fontSize: 13, cursor: "pointer" }}
              >⭐</button>
              <button
                onClick={e => e.stopPropagation()}
                style={{ width: 32, background: S, border: `1px solid ${B}`, borderRadius: 9, fontSize: 13, cursor: "pointer" }}
              >🔗</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
