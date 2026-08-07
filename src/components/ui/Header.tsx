export default function Header() {
  return (
    <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.02em" }}>
        ERROR<span style={{ color: "#00C805" }}>404</span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", background: "rgba(0,200,5,0.18)", border: "1px solid rgba(0,200,5,0.3)", borderRadius: 100, color: "#00C805" }}>
        Robinhood Chain
      </div>
    </div>
  );
}
