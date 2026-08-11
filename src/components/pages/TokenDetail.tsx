"use client";
import { useState, useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import type { Token } from "../Terminal";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";

interface LiveTx {
  type: string;
  wallet: string;
  amount: string;
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

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];

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
  const [priceMode, setPriceMode] = useState<"price" | "mcap">("price");
  const [livePrice, setLivePrice] = useState(token.price);
  const [liveChange, setLiveChange] = useState(token.change);
  const [liveTxs, setLiveTxs] = useState<LiveTx[]>([]);
  const [tradeStats, setTradeStats] = useState<TradeStats | null>(null);
  const [chartState, setChartState] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const [chartMessage, setChartMessage] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [hasMcap, setHasMcap] = useState(false);
  const pos = liveChange > 0;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Create chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: fullscreen ? window.innerHeight - 160 : 260,
      layout: {
        background: { color: "transparent" },
        textColor: T2,
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: B,
      },
      rightPriceScale: { borderColor: B },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: G,
      downColor: R,
      borderVisible: false,
      wickUpColor: G,
      wickDownColor: R,
    });
    candleSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.3 },
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: fullscreen ? window.innerHeight - 160 : 260,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [fullscreen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load candles for selected timeframe / price mode
  useEffect(() => {
    if (!token.pairAddress) {
      setChartState("error");
      return;
    }

    let cancelled = false;

    const loadCandles = async () => {
      try {
        const res = await fetch(
          `/api/market/candles?pairAddress=${token.pairAddress}&ca=${token.ca}&tf=${tf}&price=${livePrice}`
        );
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
          open: priceMode === "mcap" && c.mcapOpen !== null && c.mcapOpen !== undefined ? c.mcapOpen : c.open,
          high: priceMode === "mcap" && c.mcapHigh !== null && c.mcapHigh !== undefined ? c.mcapHigh : c.high,
          low: priceMode === "mcap" && c.mcapLow !== null && c.mcapLow !== undefined ? c.mcapLow : c.low,
          close: priceMode === "mcap" && c.mcapClose !== null && c.mcapClose !== undefined ? c.mcapClose : c.close,
        }));

        const volumeData = data.volume.map((v: any) => ({
          time: v.time as UTCTimestamp,
          value: v.value,
          color: v.color,
        }));

        candleSeriesRef.current?.setData(candleData);
        volumeSeriesRef.current?.setData(volumeData);
        setChartState("ok");
      } catch (e) {
        console.error("candles fetch failed", e);
        if (!cancelled) {
          setChartState("error");
          setChartMessage("Couldn't load chart data — retrying…");
        }
      }
    };

    setChartState("loading");
    loadCandles();
    const interval = setInterval(loadCandles, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tf, priceMode, token.pairAddress, token.ca]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll live price/change for header
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/market/tokens?ca=${token.ca}`);
        const data = await res.json();
        if (data?.price) {
          setLivePrice(data.price);
          setLiveChange(data.change ?? 0);
        }
      } catch (e) {
        console.error("price poll failed", e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [token.ca]);

  // Poll real transactions + stats
  useEffect(() => {
    if (!token.pairAddress) return;
    const fetchTxs = async () => {
      try {
        const res = await fetch(`/api/market/transactions?pairAddress=${token.pairAddress}&ca=${token.ca}&price=${livePrice}`);
        const data = await res.json();
        if (Array.isArray(data.trades)) setLiveTxs(data.trades);
        if (data.stats) setTradeStats(data.stats);
      } catch (e) {
        console.error("tx fetch failed", e);
      }
    };
    fetchTxs();
    const interval = setInterval(fetchTxs, 8000);
    return () => clearInterval(interval);
  }, [token.pairAddress, token.ca]); // eslint-disable-line react-hooks/exhaustive-deps

  function copyCA() {
    navigator.clipboard.writeText(token.ca);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${B}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: S, border: `1px solid ${B}`, borderRadius: 9, padding: "5px 10px", color: "#f2f2f7", cursor: "pointer", fontSize: 12 }}>← Back</button>
        <div style={{ fontSize: 22 }}>{token.logo}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>
            {token.name}
            {token.verified && <span style={{ color: G, fontSize: 11 }}>✓</span>}
            <span style={{ fontSize: 9, color: G, background: "rgba(0,200,5,0.1)", border: `1px solid rgba(0,200,5,0.3)`, borderRadius: 5, padding: "1px 5px" }}>RBN</span>
          </div>
          <div onClick={copyCA} style={{ fontSize: 11, color: T2, fontFamily: "monospace", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            {token.ca.slice(0, 10)}…{token.ca.slice(-6)} <span style={{ fontSize: 10 }}>⧉</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>${livePrice < 0.001 ? livePrice.toExponential(2) : livePrice.toFixed(4)}</div>
          <div style={{ fontSize: 11, color: pos ? G : R, fontWeight: 600 }}>{pos ? "+" : ""}{liveChange}%</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "10px 16px 100px" }}>
        {/* Chart */}
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

          <div style={{ fontSize: 9, color: "#48484a", marginTop: 6, textAlign: "center" }}>
            On-chain OHLCV · Derived from Swap events
            {priceMode === "price" && " · USD values are normalized using the available reference price."}
          </div>
        </div>

        {!fullscreen && (
          <>
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

            {/* Buy/Sell pressure */}
            {tradeStats && (
              <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
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

            {/* Live trades */}
            <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>Live Trades</div>

              {!token.pairAddress && (
                <div style={{ fontSize: 11, color: T2, textAlign: "center", padding: "10px 0" }}>No pair address available</div>
              )}
              {token.pairAddress && liveTxs.length === 0 && (
                <div style={{ fontSize: 11, color: T2, textAlign: "center", padding: "10px 0" }}>Loading trades…</div>
              )}

              {liveTxs.map((tx, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={(e) => { e.preventDefault(); window.open(`https://dexscreener.com/robinhood/${token.pairAddress}?tx=${tx.txHash}`, "_blank"); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, marginBottom: 8, borderBottom: i < liveTxs.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none", textDecoration: "none", cursor: "pointer" }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: tx.type === "buy" ? "rgba(0,200,5,0.12)" : "rgba(255,59,48,0.12)", color: tx.type === "buy" ? G : R }}>
                    {tx.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: T2, fontFamily: "monospace", flex: 1 }}>{tx.wallet}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#f2f2f7" }}>{tx.amount}</span>
                  <span style={{ fontSize: 10, color: "#48484a" }}>{tx.ago}</span>
                </a>
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
          </>
        )}
      </div>
    </div>
  );
}
