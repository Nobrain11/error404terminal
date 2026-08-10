"use client";
import { useState, useEffect, useCallback } from "react";
import type { Token } from "../Terminal";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

const TABS = ["Trending", "New", "Top Volume", "Gainers", "Losers"];

interface RawPair {
  ca: string;
  name: string;
  ticker: string;
  price: number;
  change: number;
  mcap: string;
  liq: string;
  vol: string;
  age: string;
  holders: number;
  verified: boolean;
  logo: string;
  pairAddress: string;
  dexId: string;
  url: string;
}

function TokenImage({ ticker, url }: { ticker: string; url?: string }) {
  const [err, setErr] = useState(false);
  const letter = ticker?.[0]?.toUpperCase() || "?";
  const colors = ["#00C805","#007AFF","#FF9500","#FF3B30","#AF52DE","#FF2D55","#5AC8FA","#34C759"];
  const color = colors[letter.charCodeAt(0) % colors.length];

  if (url && !err) {
    return (
      <img
        src={`https://dd.dexscreener.com/ds-data/tokens/robinhood/${url.toLowerCase()}.png`}
        onError={() => setErr(true)}
        style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }}
        alt={ticker}
      />
    );
  }

  return (
    <div style={{
      width: 38, height: 38, borderRadius: "50%",
      background: `${color}22`, border: `1px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, fontWeight: 800, color,
    }}>
      {letter}
    </div>
  );
}

function PriceChange({ change }: { change: number }) {
  const n = typeof change === "number" ? change : parseFloat(change as any) || 0;
  const pos = n >= 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: pos ? G : R,
      background: pos ? "rgba(0,200,5,0.1)" : "rgba(255,59,48,0.1)",
      padding: "2px 6px", borderRadius: 6,
    }}>
      {pos ? "▲" : "▼"} {Math.abs(n).toFixed(2)}%
    </span>
  );
}

export default function DiscoverPage({ onSelectToken }: { onSelectToken: (t: Token) => void }) {
  const [tab, setTab] = useState("Trending");
  const [search, setSearch] = useState("");
  const [tokens, setTokens] = useState<RawPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());

  const fetchTokens = useCallback(async (q?: string) => {
    try {
      const url = q
        ? `/api/market/tokens?q=${encodeURIComponent(q)}`
        : `/api/market/tokens`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        let sorted = [...data];
        if (tab === "New") sorted.sort((a, b) => {
          const aMs = parseAge(a.age);
          const bMs = parseAge(b.age);
          return aMs - bMs;
        });
        if (tab === "Top Volume") sorted.sort((a, b) => parseFloat(b.vol) - parseFloat(a.vol));
        if (tab === "Gainers") sorted.sort((a, b) => (b.change || 0) - (a.change || 0));
        if (tab === "Losers") sorted.sort((a, b) => (a.change || 0) - (b.change || 0));
        setTokens(sorted);
        setLastUpdate(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  function parseAge(age: string): number {
    if (!age) return 999999;
    const n = parseInt(age);
    if (age.includes("m")) return n;
    if (age.includes("h")) return n * 60;
    if (age.includes("d")) return n * 1440;
    return 999999;
  }

  useEffect(() => {
    setLoading(true);
    fetchTokens(search || undefined);
  }, [tab]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTokens(search || undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchTokens, search]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (search) fetchTokens(search);
      else fetchTokens();
    }, 400);
    return () => clearTimeout(debounce);
  }, [search]);

  function toggleWatchlist(ca: string, e: React.MouseEvent) {
    e.stopPropagation();
    setWatchlist(prev => {
      const next = new Set(prev);
      next.has(ca) ? next.delete(ca) : next.add(ca);
      return next;
    });
  }

  function toToken(t: RawPair, i: number): Token {
    return {
      id: i,
      name: t.name,
      ticker: t.ticker,
      price: t.price,
      change: typeof t.change === "number" ? t.change : parseFloat(t.change as any) || 0,
      mcap: t.mcap,
      liq: t.liq,
      vol: t.vol,
      age: t.age,
      holders: t.holders || 0,
      verified: t.verified || false,
      logo: t.ca,
      ca: t.ca,
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Search */}
      <div style={{ padding: "10px 16px 0" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: T3 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tokens or paste CA…"
            style={{
              width: "100%", background: S,
              border: `1px solid ${B}`,
              borderRadius: 12, padding: "10px 14px 10px 36px",
              fontSize: 13, color: "#f2f2f7", outline: "none",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: T2, cursor: "pointer", fontSize: 16,
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "8px 16px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 14px",
            borderRadius: 100,
            border: `1px solid ${tab === t ? G : B}`,
            background: tab === t ? "rgba(0,200,5,0.12)" : "none",
            color: tab === t ? G : T2,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}>{t}</button>
        ))}
      </div>

      {/* Live bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", background: G,
            boxShadow: `0 0 6px ${G}`,
            animation: "livepulse 2s infinite",
          }} />
          <style>{`@keyframes livepulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          <span style={{ fontSize: 10, color: T2 }}>
            LIVE · Robinhood Chain · {tokens.length} pairs
          </span>
        </div>
        {lastUpdate && (
          <span style={{ fontSize: 10, color: T3 }}>
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 100px", scrollbarWidth: "none" }}>
        {loading && (
          <>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                height: 90, borderRadius: 14, marginBottom: 8,
                background: "linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }} />
            ))}
            <style>{`@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}`}</style>
          </>
        )}

        {!loading && tokens.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No tokens found</div>
            <div style={{ fontSize: 12, color: T2 }}>Try a different search term</div>
          </div>
        )}

        {!loading && tokens.map((t, i) => {
          const change = typeof t.change === "number" ? t.change : parseFloat(t.change as any) || 0;
          const pos = change >= 0;
          const starred = watchlist.has(t.ca);

          return (
            <div
              key={t.pairAddress || i}
              onClick={() => onSelectToken(toToken(t, i))}
              style={{
                background: S,
                border: `1px solid ${B}`,
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 8,
                cursor: "pointer",
                transition: "border-color .15s, background .15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = B)}
            >
              {/* Row 1 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <TokenImage ticker={t.ticker} url={t.ca} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.name}
                    </span>
                    {t.dexId && (
                      <span style={{ fontSize: 9, color: T3, background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>
                        {t.dexId}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T2 }}>{t.ticker}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                    ${t.price < 0.0001
                      ? t.price.toExponential(2)
                      : t.price < 1
                      ? t.price.toFixed(6)
                      : t.price >= 1000
                      ? t.price.toLocaleString("en-US", { maximumFractionDigits: 2 })
                      : t.price.toFixed(4)}
                  </div>
                  <PriceChange change={change} />
                </div>
              </div>

              {/* Row 2 — stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginBottom: 10 }}>
                {[
                  ["MCap", t.mcap],
                  ["Liq", t.liq],
                  ["Vol 24H", t.vol],
                  ["Age", t.age],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "5px 7px" }}>
                    <div style={{ fontSize: 9, color: T3, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T2 }}>{v || "—"}</div>
                  </div>
                ))}
              </div>

              {/* Row 3 — actions */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={e => { e.stopPropagation(); onSelectToken(toToken(t, i)); }}
                  style={{
                    flex: 1, background: G, color: "#000",
                    border: "none", borderRadius: 9,
                    padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Buy
                </button>
                <button
                  onClick={e => toggleWatchlist(t.ca, e)}
                  style={{
                    width: 36, background: starred ? "rgba(255,200,0,0.12)" : S,
                    border: `1px solid ${starred ? "rgba(255,200,0,0.4)" : B}`,
                    borderRadius: 9, fontSize: 14, cursor: "pointer",
                    color: starred ? "#FFD60A" : T2,
                  }}
                >
                  {starred ? "★" : "☆"}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); window.open(t.url, "_blank"); }}
                  style={{
                    width: 36, background: S, border: `1px solid ${B}`,
                    borderRadius: 9, fontSize: 12, cursor: "pointer", color: T2,
                  }}
                >
                  📊
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
