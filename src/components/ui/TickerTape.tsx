const TICKS = [
  { t: "RBTK", p: "+42.3%" }, { t: "CPEPE", p: "+128.7%" },
  { t: "RAI", p: "-8.2%" }, { t: "MBASE", p: "+67.1%" },
  { t: "RIFI", p: "+11.4%" }, { t: "QSWP", p: "-14.9%" },
];

export default function TickerTape() {
  const doubled = [...TICKS, ...TICKS];
  return (
    <div style={{ overflow: "hidden", background: "rgba(0,200,5,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)", height: 28, display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 40, animation: "ticker 28s linear infinite", whiteSpace: "nowrap", paddingLeft: "100%" }}>
        {doubled.map((d, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 500, display: "flex", gap: 6 }}>
            <span style={{ color: "#8e8e93" }}>{d.t}</span>
            <span style={{ color: d.p.startsWith("+") ? "#00C805" : "#FF3B30" }}>{d.p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
