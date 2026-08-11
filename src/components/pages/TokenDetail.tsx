"use client";
import { useState, useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
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
  const [livePrice, setLivePrice] = useState(token.price);
  const [liveChange, setLiveChange] = useState(token.change);
  const pos = liveChange > 0;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  // Create chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 160,
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

    const series = chart.addAreaSeries({
      lineColor: pos ? G : R,
      topColor: pos ? "rgba(0,200,5,0.25)" : "rgba(255,59,48,0.25)",
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 2,
    });

    // Seed with the initial price so the chart isn't empty on open
    series.setData([
      { time: (Math.floor(Date.now() / 1000) - 1) as UTCTimestamp, value: token.price },
    ]);

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll real price and push new points
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/market/tokens?ca=${token.ca}`);
        const data = await res.json();
        if (data?.price) {
          setLivePrice(data.price);
          setLiveChange(data.change ?? 0);
          seriesRef.current?.update({
            time: Math.floor(Date.now() / 1000) as UTCTimestamp,
            value: data.price,
          });
        }
      } catch (e) {
        console.error("price poll failed", e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [token.ca]);

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
          <div style={{ fontSize: 16, fontWeight: 700 }}>${livePrice < 0.001 ? livePrice.toExponential(2) : livePrice.toFixed(4)}</div>
          <div style={{ fontSize: 11, color: pos ? G : R, fontWeight: 600 }}>{pos ? "+" : ""}{liveChange}%</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", padding: "10px 16px 100px" }}>
        {/* Chart */}
        <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
          <div ref={chartContainerRef} style={{ width: "100%" }} />
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
