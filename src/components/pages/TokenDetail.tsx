"use client";
import { useState, useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import type { Token } from "../Terminal";
import { useAuth } from "@/lib/auth-context";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

interface LiveTx {
  type: string;
  wallet: string;
  walletFull: string;
  amount: string;
  amountUsd: number;
  mcap: string;
  ago: string;
  txHash: string;
}

interface TradeStats {
  buyCount: number;
  sellCount: number;
  buyVolumeUsd: number;
  sellVolumeUsd: number;
  buyPressure: number;
}

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"];
const DETAIL_TABS = ["Chart", "Trades", "Positions", "Orders"];
const QUICK_AMOUNTS = ["$10", "$25", "$50", "$100", "MAX"];

export default function TokenDetail({
  token,
  onBack,
  onTrade,
}: {
  token: Token;
  onBack: () => void;
  onTrade: (t: Token, side: "buy" | "sell") => void;
}) {
  const { wallet, status } = useAuth();
  const [detailTab, setDetailTab] = useState("Chart");
  const [tf, setTf] = useState("1H");
  const [priceMode, setPriceMode] = useState<"price" | "mcap">("price");
  const [livePrice, setLivePrice] = useState(token.price);
  const [liveChange, setLiveChange] = useState(token.change);
  const [liveTxs, setLiveTxs] = useState<LiveTx[]>([]);
  const [tradeStats, setTradeStats] = useState<TradeStats | null>(null);
  const [chartState, setChartState] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const [chartMessage, setChartMessage] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [hasMcap, setHasMcap] = useState(false);
  const [sideFilter, setSideFilter] = useState<"all" | "buy" | "sell">("all");
  const [minSize, setMinSize] = useState("");
  const [walletSearch, setWalletSearch] = useState("");
  const [quickAmount, setQuickAmount] = useState("$25");
  const pos = liveChange > 0;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Create chart once
  useEffect(() => {
    if (detailTab !== "Chart" || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: fullscreen ? window.innerHeight - 160 : 240,
      layout: { background: { color: "transparent" }, textColor: T2, fontSize: 10 },
      grid: { vertLines: { visible: false }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      timeScale: { timeVisible: true, secondsVisible: true, borderColor: B },
      rightPriceScale: { borderColor: B },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: G, downColor: R, borderVisible: false, wickUpColor: G, wickDownColor: R,
    });
    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.3 } });

    const volumeSeries = chart.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "" });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: fullscreen ? window.innerHeight - 160 : 240,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [fullscreen, detailTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load candles
  useEffect(() => {
    if (detailTab !== "Chart") return;
    if (!token.pairAddress) { setChartState("error"); return; }

    let cancelled = false;
    const loadCandles = async () => {
      try {
        const res = await fetch(`/api/market/candles?pairAddress=${token.pairAddress}&ca=${token.ca}&tf=${tf}&price=${livePrice}`);
        const data = await res.json();
        if (cancelled) return;

        setHasMcap(!!data.hasMcap);

        if (data.state === "error") {
          setChartState("error");
          setChartMessage(data.note || "Couldn't load chart data — retrying…");
          return;
        }
        if (!data.candles || data.candles.length === 0) {
          setChartState("empty");
          setChartMessage(data.message || "No on-chain trades available for this period.");
          candleSeriesRef.current?.setData([]);
          volumeSeriesRef.current?.setData([]);
          return;
        }

        const candleData = data.candles.map((c: any) => ({
          time: c.time as UTCTimestamp,
          open: priceMode === "mcap" && c.mcapOpen != null ? c.mcapOpen : c.open,
          high: priceMode === "mcap" && c.mcapHigh != null ? c.mcapHigh : c.high,
          low: priceMode === "mcap" && c.mcapLow != null ? c.mcapLow : c.low,
          close: priceMode === "mcap" && c.mcapClose != null ? c.mcapClose : c.close,
        }));
        const volumeData = data.volume.map((v: any) => ({ time: v.time as UTCTimestamp, value: v.value, color: v.color }));

        candleSeriesRef.current?.setData(candleData);
        volumeSeriesRef.current?.setData(volumeData);
        setChartState("ok");
      } catch (e) {
        console.error("candles fetch failed", e);
        if (!cancelled) { setChartState("error"); setChartMessage("Couldn't load chart data — retrying…"); }
      }
    };

    setChartState("loading");
    loadCandles();
    const interval = setInterval(loadCandles, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tf, priceMode, token.pairAddress, token.ca, detailTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll live price/change
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/market/tokens?ca=${token.ca}`);
        const data = await res.json();
        if (data?.price) { setLivePrice(data.price); setLiveChange(data.change ?? 0); }
      } catch (e) { console.error("price poll failed", e); }
    }, 5000);
    return () => clearInterval(interval);
  }, [token.ca]);

  // Poll real transactions + stats (filters applied server-side)
  useEffect(() => {
    if (!token.pairAddress) return;
    const fetchTxs = async () => {
      try {
        const params = new URLSearchParams({
          pairAddress: token.pairAddress!,
          ca: token.ca,
          price: String(livePrice),
        });
        if (sideFilter !== "all") params.set("side", sideFilter);
        if (minSize) params.set("minSize", minSize);
        if (walletSearch) params.set("wallet", walletSearch.toLowerCase());

        const res = await fetch(`/api/market/transactions?${params.toString()}`);
        const data = await res.json();
        if (Array.isArray(data.trades)) setLiveTxs(data.trades);
        if (data.stats) setTradeStats(data.stats);
      } catch (e) { console.error("tx fetch failed", e); }
    };
    fetchTxs();
    const interval = setInterval(fetchTxs, 8000);
    return () => clearInterval(interval);
  }, [token.pairAddress, token.ca, sideFilter, minSize, walletSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  function copyCA() {
    navigator.clipboard.writeText(token.ca);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${B}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: S, border: `1px solid ${B}`, borderRadius: 9, padding: "5px 10px", color: "#f2f2f7", cursor: "pointer", fontSize: 12 }}>← Back</button>
        <div style={{ fontSize: 22 }}>{token.logo}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>
            {token.name}
            {token.verified && <span style={{ color: G, fontSize: 11 }}>✓</span>}
          </div>
          <div style={{ fontSize: 11, color: T2, display: "flex", alignItems: "center", gap: 5 }}>
            <span>${token.ticker}</span>
            <span onClick={copyCA} style={{ fontFamily: "monospace", cursor: "pointer" }}>
              {token.ca.slice(0, 6)}…{token.ca.slice(-4)} ⧉
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>${livePrice < 0.001 ? livePrice.toExponential(2) : livePrice.toFixed(4)}</div>
          <div style={{ fontSize: 11, color: T2 }}>MC ${token.mcap}</div>
        </div>
      </div>

      {/* Detail tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${B}`, flexShrink: 0 }}>
        {DETAIL_TABS.map(t => (
          <button key={t} onClick={() => setDetailTab(t)} style={{
            flex: 1, padding: "10px 0", background: "none", border: "none",
            borderBottom: detailTab === t ? `2px solid ${G}` : "2px solid transparent",
            color: detailTab === t ? G : T2, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "10px 16px 130px" }}>
        {detailTab === "Chart" && (
          <>
            <div style={{
              background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 10,
              ...(fullscreen ? { position: "fixed" as const, inset: 0, zIndex: 50, background: "#0a0a0b", borderRadius: 0, margin: 0 } : {}),
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setPriceMode("price")} style={{
                    background: priceMode === "price" ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${priceMode === "price" ? "rgba(0,200,5,0.4)" : B}`,
                    borderRadius: 7, padding: "3px 10px", fontSize: 10, fontWeight: 600,
                    color: priceMode === "price" ? G : T2, cursor: "pointer",
                  }}>Price</button>
                  <button
                    onClick={() => hasMcap && setPriceMode("mcap")}
                    disabled={!hasMcap}
                    style={{
                      background: priceMode === "mcap" ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${priceMode === "mcap" ? "rgba(0,200,5,0.4)" : B}`,
                      borderRadius: 7, padding: "3px 10px", fontSize: 10, fontWeight: 600,
                      color: priceMode === "mcap" ? G : T2, cursor: hasMcap ? "pointer" : "not-allowed", opacity: hasMcap ? 1 : 0.4,
                    }}>MCap</button>
                </div>
                <button onClick={() => setFullscreen(f => !f)} style={{
                  background: "rgba(255,255,255,0.03)", border: `1px solid ${B}`, borderRadius: 7,
                  padding: "3px 8px", fontSize: 11, color: T2, cursor: "pointer",
                }}>{fullscreen ? "✕ Close" : "⛶ Fullscreen"}</button>
              </div>

              <div style={{ position: "relative" }}>
                <div ref={chartContainerRef} style={{ width: "100%" }} />
                {chartState === "loading" && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,10,11,0.6)" }}>
                    <span style={{ fontSize: 12, color: T2 }}>Loading real trade data…</span>
                  </div>
                )}
                {chartState === "empty" && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,10,11,0.6)" }}>
                    <span style={{ fontSize: 12, color: T2, textAlign: "center", padding: "0 20px" }}>{chartMessage}</span>
                  </div>
                )}
                {chartState === "error" && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,10,11,0.6)" }}>
                    <span style={{ fontSize: 12, color: R, textAlign: "center", padding: "0 20px" }}>{chartMessage}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                {TIMEFRAMES.map(t => (
                  <button key={t} onClick={() => setTf(t)} style={{
                    background: tf === t ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${tf === t ? "rgba(0,200,5,0.4)" : B}`,
                    borderRadius: 7, padding: "3px 8px", fontSize: 10, fontWeight: 600,
                    color: tf === t ? G : T2, cursor: "pointer",
                  }}>{t}</button>
                ))}
              </div>

              <div style={{ fontSize: 9, color: T3, marginTop: 6, textAlign: "center" }}>
                On-chain OHLCV · Derived from Swap events
                {priceMode === "price" && " · USD values are normalized using the available reference price."}
              </div>
            </div>

            {!fullscreen && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                {[
                  ["Market Cap", `$${token.mcap}`],
                  ["Liquidity", `$${token.liq}`],
                  ["Volume 24H", `$${token.vol}`],
                  ["Buys", tradeStats ? String(tradeStats.buyCount) : "—"],
                  ["Sells", tradeStats ? String(tradeStats.sellCount) : "—"],
                  ["Age", token.age],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: S, border: `1px solid ${B}`, borderRadius: 10, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: T2, marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {!fullscreen && tradeStats && (
              <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Buy / Sell Pressure</div>
                <div style={{ display: "flex", height: 8, borderRadius: 100, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ width: `${tradeStats.buyPressure}%`, background: G }} />
                  <div style={{ width: `${100 - tradeStats.buyPressure}%`, background: R }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: G, marginBottom: 2 }}>Buys ({tradeStats.buyCount})</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>${tradeStats.buyVolumeUsd >= 1000 ? (tradeStats.buyVolumeUsd / 1000).toFixed(1) + "K" : tradeStats.buyVolumeUsd.toFixed(0)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: R, marginBottom: 2 }}>Sells ({tradeStats.sellCount})</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>${tradeStats.sellVolumeUsd >= 1000 ? (tradeStats.sellVolumeUsd / 1000).toFixed(1) + "K" : tradeStats.sellVolumeUsd.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {detailTab === "Trades" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {(["all", "buy", "sell"] as const).map(s => (
                <button key={s} onClick={() => setSideFilter(s)} style={{
                  background: sideFilter === s ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${sideFilter === s ? "rgba(0,200,5,0.4)" : B}`,
                  borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  color: sideFilter === s ? G : T2, cursor: "pointer", textTransform: "capitalize",
                }}>{s}</button>
              ))}
              <input
                value={minSize}
                onChange={e => setMinSize(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Min $"
                style={{
                  width: 70, background: "rgba(255,255,255,0.03)", border: `1px solid ${B}`,
                  borderRadius: 7, padding: "4px 8px", fontSize: 11, color: "#f2f2f7", outline: "none",
                }}
              />
              <input
                value={walletSearch}
                onChange={e => setWalletSearch(e.target.value)}
                placeholder="Wallet 0x…"
                style={{
                  flex: 1, minWidth: 100, background: "rgba(255,255,255,0.03)", border: `1px solid ${B}`,
                  borderRadius: 7, padding: "4px 8px", fontSize: 11, color: "#f2f2f7", outline: "none", fontFamily: "monospace",
                }}
              />
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "36px 44px 1fr 1fr 1fr", gap: 6, padding: "6px 4px", fontSize: 9, color: T3, textTransform: "uppercase", letterSpacing: ".04em" }}>
              <div>Time</div><div>Side</div><div>MC</div><div>USD</div><div>Trader</div>
            </div>

            {!token.pairAddress && (
              <div style={{ fontSize: 11, color: T2, textAlign: "center", padding: "20px 0" }}>No pair address available</div>
            )}
            {token.pairAddress && liveTxs.length === 0 && (
              <div style={{ fontSize: 11, color: T2, textAlign: "center", padding: "20px 0" }}>No trades match these filters</div>
            )}

            {liveTxs.map((tx, i) => (
              <a
                key={i}
                href="#"
                onClick={(e) => { e.preventDefault(); window.open(`https://dexscreener.com/robinhood/${token.pairAddress}?tx=${tx.txHash}`, "_blank"); }}
                style={{
                  display: "grid", gridTemplateColumns: "36px 44px 1fr 1fr 1fr", gap: 6,
                  padding: "8px 4px", borderBottom: `1px solid rgba(255,255,255,0.04)`,
                  textDecoration: "none", alignItems: "center",
                }}
              >
                <span style={{ fontSize: 10, color: T3 }}>{tx.ago}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: tx.type === "buy" ? G : R }}>{tx.type.toUpperCase()}</span>
                <span style={{ fontSize: 11, color: T2 }}>{tx.mcap}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#f2f2f7" }}>{tx.amount}</span>
                <span style={{ fontSize: 10, color: T2, fontFamily: "monospace" }}>{tx.wallet}</span>
              </a>
            ))}
          </div>
        )}

        {detailTab === "Positions" && (
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
            {status !== "connected" ? (
              <>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👛</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Connect to view positions</div>
                <div style={{ fontSize: 11, color: T2 }}>Your open position in this token will appear here once connected.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Position tracking not yet available</div>
                <div style={{ fontSize: 11, color: T2 }}>This requires on-chain position indexing, which isn't built yet — no fake data shown.</div>
              </>
            )}
          </div>
        )}

        {detailTab === "Orders" && (
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>No open orders</div>
            <div style={{ fontSize: 11, color: T2 }}>Limit orders for this token will appear here once placed.</div>
          </div>
        )}
      </div>

      {/* Sticky quick-trade bar */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: "rgba(10,10,11,0.97)", borderTop: `1px solid ${B}`,
        padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)",
      }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
          {QUICK_AMOUNTS.map(a => (
            <button key={a} onClick={() => setQuickAmount(a)} style={{
              flex: 1, padding: "6px 0", borderRadius: 8,
              border: `1px solid ${quickAmount === a ? "rgba(0,200,5,0.4)" : B}`,
              background: quickAmount === a ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.03)",
              color: quickAmount === a ? G : T2, fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>{a}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={() => onTrade(token, "buy")} style={{ padding: "13px", borderRadius: 12, border: "none", background: G, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🟢 Buy
          </button>
          <button onClick={() => onTrade(token, "sell")} style={{ padding: "13px", borderRadius: 12, border: "none", background: R, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            🔴 Sell
          </button>
        </div>
      </div>
    </div>
  );
}
