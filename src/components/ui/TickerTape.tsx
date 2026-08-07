const TICKS = [
  { t: "RBTK", p: "+42.3%" }, { t: "CPEPE", p: "+128.7%" },
  { t: "RAI", p: "-8.2%" }, { t: "MBASE", p: "+67.1%" },
  { t: "RIFI", p: "+11.4%" }, { t: "QSWP", p: "-14.9%" },
  { t: "SNIPE", p: "+88.0%" }, { t: "RBNDOGE", p: "+33.2%" },
];

export default function TickerTape() {
  const doubled = [...TICKS, ...TICKS];
  return (
    <div style={{
      overflow: "hidden",
      background: "rgba(0,200,5,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      height: 26,
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
    }}>
      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-inner { display: flex; gap: 32px; animation: ticker 30s linear infinite; white-space: nowrap; padding-left: 100%; }
      `}</style>
      <div className="ticker-inner">
        {doubled.map((d, i) => (
          <div key={i} style={{ fontSize: 10, fontWeight: 600, display: "flex", gap: 5 }}>
            <span style={{ color: "#8e8e93" }}>{d.t}</span>
            <span style={{ color: d.p.startsWith("+") ? "#00C805" : "#FF3B30" }}>{d.p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
