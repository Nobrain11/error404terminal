"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Token } from "../Terminal";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

const SORT_TABS = [
  { id: "trending", label: "🔥 Trending" },
  { id: "new",      label: "🆕 New" },
  { id: "volume",   label: "📊 Volume" },
  { id: "gainers",  label: "🟢 Gainers" },
  { id: "losers",   label: "🔴 Losers" },
];

const SOURCE_COLORS: Record<string, string> = {
  pons:        "#7B61FF",
  flap:        "#FF9500",
  noxa:        "#00C8FF",
  uniswap:     "#FF007A",
  dexscreener: "#00C805",
  unknown:     "#8e8e93",
};

interface RawToken {
  ca: string;
  name: string;
  ticker: string;
  price: number;
  priceFormatted: string;
  change5m: number;
  change1h: number;
  change6h: number;
  change24h: number;
  mcapFormatted: string;
  liqFormatted: string;
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
  trendingScore: number;
}

function TokenLogo({ token }: { token: RawToken }) {
  const [err, setErr] = useState(false);
  const letter = token.ticker?.[0]?.toUpperCase() || "?";
  const color = SOURCE_COLORS[token.source] || G;

  if (token.imageUrl && !err) {
    return (
      <img
        src={token.imageUrl}
        onError={() => setErr(true)}
        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        alt={token.ticker}
      />
    );
  }

  return (
    <div style={{
      width: 40, height: 40, borderRadius: "50%",
      background: `${color}18`,
      border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 17, fontWeight: 800, color, flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

function Change({ value, label }: { value: number; label?: string }) {
  const pos = value >= 0;
  if (value === 0) return <span style={{ fontSize: 10, color: T3 }}>—</span>;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color: pos ? G : R,
      background: pos ? "rgba(0,200,5,0.1)" : "rgba(255,59,48,0.1)",
      padding: "2px 5px", borderRadius: 5,
    }}>
      {label && <span style={{ opacity: .7, marginRight: 2 }}>{label}</span>}
      {pos ? "▲" : "▼"}{Math.abs(value).toFixed(1)}%
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] || T3;
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, padding: "1px 5px",
      borderRadius: 4, background: `${color}18`,
      border: `1px solid ${color}33`, color, textTransform: "uppercase",
      letterSpacing: ".05em", flexShrink: 0,
    }}>
      {source}
    </span>
  );
}

export default function DiscoverPage({ onSelectToken }: { onSelectToken: (t: Token) => void }) {
  const [sort, setSort] = useState("trending");
  const [search, setSearch] = useState("");
  const [tokens, setTokens] = useState<RawToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [activeChange, setActiveChange] = useState<"5m"|"1h"|"6h"|"24h">("24h");
  const intervalRef = useRef<NodeJS.Timeout>();
  const abortRef = useRef<AbortController>();

  const fetchTokens = useCallback(async (q?: string, s?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      else params.set("sort", s || sort);
      const res = await fetch(`/api/market/tokens?${params}`, {
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTokens(data);
        setLastUpdate(new Date());
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    setLoading(true);
    setTokens([]);
    fetchTokens(undefined, sort);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchTokens(undefined, sort), 15000);
    return () => clearInterval(intervalRef.current);
  }, [sort]);

  useEffect(() => {
    if (!search) {
      fetchTokens(undefined, sort);
      return;
    }
    const t = setTimeout(() => fetchTokens(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  function toToken(t: RawToken, i: number): Token {
    return {
      id: i,
      name: t.name,
      ticker: t.ticker,
      price: t.price,
      change: t.change24h,
      mcap: t.mcapFormatted,
      liq: t.liqFormatted,
      vol: t.volFormatted,
      age: t.age,
      holders: 0,
      verified: false,
      logo: t.ca,
      ca: t.ca,
    };
  }

  function toggleWatchlist(ca: string, e: React.MouseEvent) {
    e.stopPropagation();
    setWatchlist(prev => {
      const n = new Set(prev);
      n.has(ca) ? n.delete(ca) : n.add(ca);
      return n;
    });
  }

  const changeVal = (t: RawToken) =>
    activeChange === "5m" ? t.change5m :
    activeChange === "1h" ? t.change1h :
    activeChange === "6h" ? t.change6h :
    t.change24h;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {/* Search */}
      <div style={{ padding: "10px 16px 0" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T3, fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tokens or paste CA…"
            style={{
              width: "100%", background: S, border: `1px solid ${B}`,
              borderRadius: 12, padding: "10px 36px 10px 36px",
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

      {/* Sort tabs */}
      <div style={{ display: "flex", gap: 4, padding: "8px 16px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
        {SORT_TABS.map(t => (
          <button key={t.id} onClick={() => { setSort(t.id); setSearch(""); }} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 100,
            border: `1px solid ${sort === t.id ? G : B}`,
            background: sort === t.id ? "rgba(0,200,5,0.12)" : "none",
            color: sort === t.id ? G : T2,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Change period selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: G, boxShadow: `0 0 6px ${G}`, animation: "lp 2s infinite" }} />
          <style>{`@keyframes lp{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          <span style={{ fontSize: 10, color: T2 }}>
            LIVE · {tokens.length} pairs
            {lastUpdate && ` · ${lastUpdate.toLocaleTimeString()}`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {(["5m","1h","6h","24h"] as const).map(p => (
            <button key={p} onClick={() => setActiveChange(p)} style={{
              fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 6,
              border: `1px solid ${activeChange === p ? G : B}`,
              background: activeChange === p ? "rgba(0,200,5,0.12)" : "none",
              color: activeChange === p ? G : T3, cursor: "pointer",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 100px", scrollbarWidth: "none" }}>
        {loading && (
          <>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{
                height: 100, borderRadius: 14, marginBottom: 8,
                background: "linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%)",
                backgroundSize: "200% 100%", animation: "sh 1.5s infinite",
              }} />
            ))}
            <style>{`@keyframes sh{from{background-position:200% 0}to{background-position:-200% 0}}`}</style>
          </>
        )}

        {!loading && tokens.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No tokens found</div>
            <div style={{ fontSize: 12, color: T2 }}>Try a different search</div>
          </div>
        )}

        {!loading && tokens.map((t, i) => {
          const chg = changeVal(t);
          const pos = chg >= 0;
          const starred = watchlist.has(t.ca);
          const buySellRatio = t.buys24h + t.sells24h > 0
            ? Math.round((t.buys24h / (t.buys24h + t.sells24h)) * 100)
            : null;

          return (
            <div
              key={t.pairAddress || t.ca || i}
              onClick={() => onSelectToken(toToken(t, i))}
              style={{
                background: S, border: `1px solid ${B}`,
                borderRadius: 14, padding: "12px 14px",
                marginBottom: 8, cursor: "pointer",
                transition: "all .15s",
              }}
            >
              {/* Row 1 — logo + name + price */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <TokenLogo token={t} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.name}
                    </span>
                    <SourceBadge source={t.source} />
                  </div>
                  <div style={{ fontSize: 11, color: T2 }}>{t.ticker} · {t.age}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{t.priceFormatted}</div>
                  <Change value={chg} />
                </div>
              </div>

              {/* Row 2 — stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginBottom: 8 }}>
                {[
                  ["MCap", t.mcapFormatted],
                  ["Liq", t.liqFormatted],
                  ["Vol 24H", t.volFormatted],
                  ["Buys/Sells", buySellRatio !== null ? `${buySellRatio}%` : "—"],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "5px 6px" }}>
                    <div style={{ fontSize: 9, color: T3, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: l === "Buys/Sells" && buySellRatio !== null ? (buySellRatio > 50 ? G : R) : T2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Row 3 — change pills */}
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                <Change value={t.change5m} label="5m" />
                <Change value={t.change1h} label="1h" />
                <Change value={t.change6h} label="6h" />
                <Change value={t.change24h} label="24h" />
              </div>

              {/* Row 4 — actions */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={e => { e.stopPropagation(); onSelectToken(toToken(t, i)); }}
                  style={{
                    flex: 1, background: G, color: "#000",
                    border: "none", borderRadius: 9,
                    padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >Buy</button>
                <button
                  onClick={e => toggleWatchlist(t.ca, e)}
                  style={{
                    width: 36, background: starred ? "rgba(255,200,0,0.12)" : S,
                    border: `1px solid ${starred ? "rgba(255,200,0,0.4)" : B}`,
                    borderRadius: 9, fontSize: 15, cursor: "pointer",
                    color: starred ? "#FFD60A" : T2,
                  }}
                >{starred ? "★" : "☆"}</button>
                <button
                  onClick={e => { e.stopPropagation(); window.open(t.dexUrl, "_blank"); }}
                  style={{
                    width: 36, background: S, border: `1px solid ${B}`,
                    borderRadius: 9, fontSize: 12, cursor: "pointer", color: T2,
                  }}
                >📊</button>
                {t.telegram && (
                  <button
                    onClick={e => { e.stopPropagation(); window.open(t.telegram, "_blank"); }}
                    style={{
                      width: 36, background: S, border: `1px solid ${B}`,
                      borderRadius: 9, fontSize: 12, cursor: "pointer", color: T2,
                    }}
                  >✈️</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
