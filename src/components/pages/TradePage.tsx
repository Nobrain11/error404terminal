"use client";
import { useState } from "react";
import type { Token } from "../Terminal";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

const TABS = ["Buy", "Sell", "Limit", "Multi"];

export default function TradePage({ token, side }: { token: Token | null; side: "buy" | "sell" }) {
  const [tab, setTab] = useState(side === "sell" ? "Sell" : "Buy");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [slip, setSlip] = useState("0.5");
  const [gas, setGas] = useState("Fast");
  const [done, setDone] = useState(false);
  const [limitPrice, setLimitPrice] = useState("");
  const [wallets, setWallets] = useState([true, false, false]);

  const t = token || { name: "RobinToken", ticker: "RBTK", price: 0.004821, change: 42.3, logo: "🟢" };

  function submit() {
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 100px", scrollbarWidth: "none" }}>
      {/* Token selector */}
      <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 28 }}>{t.logo}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{t.name}</div>
          <div style={{ fontSize: 12, color: T2 }}>{t.ticker} · Robinhood Chain</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>${t.price.toFixed(4)}</div>
          <div style={{ fontSize: 11, color: t.change > 0 ? G : R, fontWeight: 600 }}>
            {t.change > 0 ? "+" : ""}{t.change}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: S, border: `1px solid ${B}`, borderRadius: 12, padding: 3, marginBottom: 10 }}>
        {TABS.map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{
            flex: 1, padding: "7px", borderRadius: 9, border: "none",
            background: tab === tb ? (tb === "Sell" ? R : G) : "none",
            color: tab === tb ? (tb === "Sell" ? "#fff" : "#000") : T2,
            fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>{tb}</button>
        ))}
      </div>

      {done ? (
        <div style={{ background: S, border: `1px solid rgba(0,200,5,0.3)`, borderRadius: 14, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Transaction Sent!</div>
          <div style={{ fontSize: 13, color: T2 }}>Confirming on Robinhood Chain…</div>
        </div>
      ) : (
        <>
          {/* Buy / Sell */}
          {(tab === "Buy" || tab === "Sell") && (
            <>
              <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${B}`, borderRadius: 12,
                      padding: "12px 50px 12px 14px", fontSize: 20, fontWeight: 700,
                      color: "#f2f2f7", outline: "none",
                    }}
                  />
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 600, color: T2 }}>
                    {tab === "Buy" ? "ETH" : t.ticker}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
                  {(tab === "Buy" ? ["10%", "25%", "50%", "MAX"] : ["25%", "50%", "75%", "MAX"]).map((p, i) => (
                    <button key={p} onClick={() => setPct(i)} style={{
                      padding: "7px", background: pct === i ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${pct === i ? "rgba(0,200,5,0.4)" : B}`,
                      borderRadius: 9, fontSize: 11, fontWeight: 700,
                      color: pct === i ? G : T2, cursor: "pointer",
                    }}>{p}</button>
                  ))}
                </div>
                {[
                  ["Estimated", tab === "Buy" ? "~1,842,301 RBTK" : "~0.0088 ETH"],
                  ["Price Impact", "< 0.1%"],
                  ["Min. Received", tab === "Buy" ? "~1,805,455 RBTK" : "~0.0086 ETH"],
                  ["Network Fee", "~$0.08"],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <span style={{ fontSize: 12, color: T2 }}>{l}</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Settings */}
              <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: T2 }}>Slippage</span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["0.1", "0.5", "1.0", "2.0"].map(s => (
                      <button key={s} onClick={() => setSlip(s)} style={{
                        padding: "3px 8px", borderRadius: 7,
                        border: `1px solid ${slip === s ? G : B}`,
                        background: slip === s ? "rgba(0,200,5,0.12)" : "none",
                        fontSize: 10, fontWeight: 700,
                        color: slip === s ? G : T2, cursor: "pointer",
                      }}>{s}%</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: T2 }}>Gas Priority</span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["Normal", "Fast", "Turbo"].map(g => (
                      <button key={g} onClick={() => setGas(g)} style={{
                        padding: "3px 8px", borderRadius: 7,
                        border: `1px solid ${gas === g ? G : B}`,
                        background: gas === g ? "rgba(0,200,5,0.12)" : "none",
                        fontSize: 10, fontWeight: 700,
                        color: gas === g ? G : T2, cursor: "pointer",
                      }}>{g}</button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={submit} style={{
                width: "100%", padding: 15, borderRadius: 13, border: "none",
                background: tab === "Buy" ? G : R,
                color: tab === "Buy" ? "#000" : "#fff",
                fontSize: 15, fontWeight: 800, cursor: "pointer",
              }}>
                {tab === "Buy" ? `Buy ${t.ticker}` : `Sell ${t.ticker}`}
              </button>
            </>
          )}

          {/* Limit */}
          {tab === "Limit" && (
            <>
              <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: T2, marginBottom: 8 }}>Target Price (USD)</div>
                <input
                  type="number"
                  placeholder="0.00"
                  value={limitPrice}
                  onChange={e => setLimitPrice(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${B}`, borderRadius: 12,
                    padding: "12px 14px", fontSize: 20, fontWeight: 700,
                    color: "#f2f2f7", outline: "none", marginBottom: 10,
                  }}
                />
                <div style={{ fontSize: 11, color: T2, marginBottom: 8 }}>Amount (ETH)</div>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${B}`, borderRadius: 12,
                    padding: "12px 14px", fontSize: 20, fontWeight: 700,
                    color: "#f2f2f7", outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={submit} style={{ padding: 14, borderRadius: 12, border: "none", background: G, color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                  🟢 Buy Limit
                </button>
                <button onClick={submit} style={{ padding: 14, borderRadius: 12, border: "none", background: R, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                  🔴 Sell Limit
                </button>
              </div>
            </>
          )}

          {/* Multi Wallet */}
          {tab === "Multi" && (
            <>
              <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>Select Wallets</div>
                {["Wallet 1 — 0x3a7f…9b44", "Wallet 2 — 0x9b2e…c11f", "Wallet 3 — 0x7f11…aa22"].map((w, i) => (
                  <div key={i} onClick={() => { const n = [...wallets]; n[i] = !n[i]; setWallets(n); }} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px", borderRadius: 10, marginBottom: 6,
                    background: wallets[i] ? "rgba(0,200,5,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${wallets[i] ? "rgba(0,200,5,0.3)" : B}`,
                    cursor: "pointer",
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, border: `2px solid ${wallets[i] ? G : T3}`,
                      background: wallets[i] ? G : "none", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#000", fontWeight: 800, flexShrink: 0,
                    }}>
                      {wallets[i] ? "✓" : ""}
                    </div>
                    <span style={{ fontSize: 12, fontFamily: "monospace" }}>{w}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: T2, marginBottom: 6 }}>Amount per wallet (ETH)</div>
                  <input
                    type="number"
                    placeholder="0.05"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${B}`, borderRadius: 10,
                      padding: "10px 12px", fontSize: 16, fontWeight: 700,
                      color: "#f2f2f7", outline: "none",
                    }}
                  />
                </div>
              </div>
              <button onClick={submit} style={{
                width: "100%", padding: 15, borderRadius: 13, border: "none",
                background: G, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer",
              }}>
                Buy with {wallets.filter(Boolean).length} Wallet{wallets.filter(Boolean).length !== 1 ? "s" : ""}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
