"use client";
import { useState } from "react";

export default function TradePage() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px 100px" }}>
      <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 3, marginBottom: 12 }}>
        <button onClick={() => setSide("buy")} style={{ flex: 1, padding: 8, borderRadius: 9, border: "none", background: side === "buy" ? "#00C805" : "none", color: side === "buy" ? "#000" : "#8e8e93", fontWeight: 600, cursor: "pointer" }}>Buy</button>
        <button onClick={() => setSide("sell")} style={{ flex: 1, padding: 8, borderRadius: 9, border: "none", background: side === "sell" ? "#FF3B30" : "none", color: side === "sell" ? "#fff" : "#8e8e93", fontWeight: 600, cursor: "pointer" }}>Sell</button>
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 16, marginBottom: 10 }}>
        <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
          style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", fontSize: 22, fontWeight: 600, color: "#f2f2f7", outline: "none" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 10 }}>
          {["25%", "50%", "75%", "MAX"].map(p => (
            <button key={p} style={{ padding: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#8e8e93", cursor: "pointer" }}>{p}</button>
          ))}
        </div>
      </div>

      <button style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", background: side === "buy" ? "#00C805" : "#FF3B30", color: side === "buy" ? "#000" : "#fff" }}>
        {side === "buy" ? "Buy Token" : "Sell Token"}
      </button>
    </div>
  );
}
