"use client";
import { useState } from "react";

const G = "#00C805";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";

const TABS = ["Watchlist", "Price Alerts", "Wallets", "Whale Alerts", "Liquidity"];

export default function TrackingPage() {
  const [tab, setTab] = useState("Watchlist");

  const WATCHLIST = [
    { logo: "🟢", name: "RobinToken", ticker: "RBTK", price: "$0.004821", change: "+42.3%", pos: true },
    { logo: "💎", name: "RobinFi", ticker: "RIFI", price: "$2.14", change: "+11.4%", pos: true },
    { logo: "🎯", name: "SnipeBot", ticker: "SNIPE", price: "$0.00334", change: "+88.0%", pos: true },
  ];

  const ALERTS = [
    { token: "RBTK", type: "Price Above", value: "$0.005", active: true },
    { token: "RIFI", type: "Whale Buy", value: "> $10K", active: true },
    { token: "ALL", type: "Portfolio", value: "+20% daily", active: false },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 4, padding: "10px 16px 8px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 100,
            border: `1px solid ${tab === t ? G : B}`,
            background: tab === t ? "rgba(0,200,5,0.12)" : "none",
            color: tab === t ? G : T2, cursor: "pointer", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 100px", scrollbarWidth: "none" }}>
        {tab === "Watchlist" && (
          <>
            {WATCHLIST.map((t, i) => (
              <div key={i} style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>{t.logo}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: T2 }}>{t.ticker}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{t.price}</div>
                  <div style={{ fontSize: 11, color: t.pos ? G : "#FF3B30", fontWeight: 600 }}>{t.change}</div>
                </div>
              </div>
            ))}
            <button style={{ width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${B}`, background: S, color: "#f2f2f7", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + Add to Watchlist
            </button>
          </>
        )}

        {tab === "Price Alerts" && (
          <>
            {ALERTS.map((a, i) => (
              <div key={i} style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{a.token}</div>
                  <div style={{ fontSize: 11, color: T2 }}>{a.type} {a.value}</div>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: 100,
                  background: a.active ? G : "#48484a",
                  position: "relative", cursor: "pointer",
                }}>
                  <div style={{
                    position: "absolute", width: 16, height: 16, background: "#fff",
                    borderRadius: "50%", top: 3, left: a.active ? 21 : 3, transition: "left .2s",
                  }} />
                </div>
              </div>
            ))}
            <button style={{ width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${G}`, background: "rgba(0,200,5,0.08)", color: G, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + New Alert
            </button>
          </>
        )}

        {tab === "Whale Alerts" && (
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14 }}>
            {[
              ["🐋", "0x3a…f91", "bought $48,200 RBTK", "2m ago"],
              ["🐋", "0x9b…c44", "sold $12,800 RIFI", "8m ago"],
              ["🐋", "0x7f…a33", "bought $91,000 SNIPE", "22m ago"],
            ].map(([icon, wallet, action, time], i) => (
              <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontFamily: "monospace", color: T2 }}>{wallet}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{action}</div>
                </div>
                <div style={{ fontSize: 10, color: "#48484a" }}>{time}</div>
              </div>
            ))}
          </div>
        )}

        {(tab === "Wallets" || tab === "Liquidity") && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{tab === "Wallets" ? "👛" : "💧"}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{tab} Tracking</div>
            <div style={{ fontSize: 12, color: T2 }}>Add wallets or tokens to track in real time.</div>
            <button style={{ marginTop: 16, padding: "12px 24px", borderRadius: 12, border: `1px solid ${G}`, background: "rgba(0,200,5,0.08)", color: G, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              + Add {tab === "Wallets" ? "Wallet" : "Token"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
