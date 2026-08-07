"use client";
import { useState } from "react";

export default function RobinBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: "bot", text: "Hey! I'm RobinBot. Ask me anything about tokens or the market." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const q = input.trim();
    setInput("");
    setMsgs(m => [...m, { from: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/robinbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMsgs(m => [...m, { from: "bot", text: data.reply }]);
    } catch {
      setMsgs(m => [...m, { from: "bot", text: "Connection issue. Try again." }]);
    }
    setLoading(false);
  }

  return (
    <>
      {open && (
        <div style={{ position: "absolute", bottom: 128, right: 18, width: 280, background: "rgba(18,18,20,0.96)", border: "1px solid rgba(0,200,5,0.2)", borderRadius: 20, padding: 16, backdropFilter: "blur(20px)", zIndex: 98 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#00C805", marginBottom: 10 }}>🤖 RobinBot</div>
          <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ background: m.from === "bot" ? "rgba(255,255,255,0.04)" : "rgba(0,200,5,0.12)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: m.from === "bot" ? "#8e8e93" : "#00C805" }}>{m.text}</div>
            ))}
            {loading && <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: "#8e8e93" }}>Thinking…</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about any token…"
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: "#f2f2f7", outline: "none" }} />
            <button onClick={send} style={{ background: "#00C805", border: "none", borderRadius: 10, width: 34, color: "#000", cursor: "pointer", fontSize: 14 }}>↑</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(b => !b)}
        style={{ position: "absolute", bottom: 72, right: 18, width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#00C805,#007a03)", border: "none", cursor: "pointer", fontSize: 20, boxShadow: "0 4px 20px rgba(0,200,5,0.4)", zIndex: 99 }}>
        🤖
      </button>
    </>
  );
}
