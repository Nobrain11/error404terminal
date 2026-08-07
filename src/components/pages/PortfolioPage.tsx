export default function PortfolioPage() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px 100px" }}>
      <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
        <div style={{ fontSize: 36, fontWeight: 700 }}>$1,820.20</div>
        <div style={{ fontSize: 11, color: "#8e8e93", marginTop: 6 }}>0x3a7f…9b44 · Robinhood Chain</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[["Today", "+$148.40", "#00C805"], ["Total PnL", "-$70.60", "#FF3B30"], ["Win Rate", "62%", "#f2f2f7"]].map(([l, v, c]) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#48484a", textTransform: "uppercase", letterSpacing: ".05em" }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      {[
        { logo: "🟢", name: "RobinToken", ticker: "RBTK", value: "$684.58", pnl: "+$228.82", pos: true },
        { logo: "💎", name: "RobinFi", ticker: "RIFI", value: "$189.22", pnl: "+$22.98", pos: true },
        { logo: "🐸", name: "ChainPepe", ticker: "CPEPE", value: "$946.40", pnl: "-$322.40", pos: false },
      ].map(a => (
        <div key={a.ticker} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>{a.logo}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: "#8e8e93" }}>{a.ticker}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>{a.value}</div>
              <div style={{ fontSize: 12, color: a.pos ? "#00C805" : "#FF3B30", fontWeight: 600 }}>{a.pnl}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
