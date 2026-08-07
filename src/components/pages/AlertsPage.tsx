"use client";
import { useState } from "react";

const INITIAL = [
  { type: "price", token: "RBTK", desc: "Price above $0.005", active: true },
  { type: "whale", token: "RIFI", desc: "Whale buy > $10K", active: true },
  { type: "portfolio", token: "ALL", desc: "Portfolio +20% daily", active: false },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(INITIAL);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px 100px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Alerts</div>
      {alerts.map((a, i) => (
        <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{a.token}</div>
            <div style={{ fontSize: 12, color: "#8e8e93" }}>{a.desc}</div>
          </div>
          <button onClick={() => setAlerts(al => al.map((x, j) => j === i ? { ...x, active: !x.active } : x))}
            style={{ width: 42, height: 24, borderRadius: 100, background: a.active ? "#00C805" : "#48484a", border: "none", cursor: "pointer", position: "relative", transition: "background .2s" }}>
            <span style={{ position: "absolute", width: 18, height: 18, background: "#fff", borderRadius: "50%", top: 3, left: a.active ? 21 : 3, transition: "left .2s" }} />
          </button>
        </div>
      ))}
      <button style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: "#00C805", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>+ Create Alert</button>
    </div>
  );
}
