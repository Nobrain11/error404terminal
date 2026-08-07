const G = "#00C805";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

export default function ReferralPage() {
  const code = "E404-XYZ123";
  const link = `https://t.me/error404terminal_bot?start=${code}`;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px", scrollbarWidth: "none" }}>
      <div style={{ background: "rgba(0,200,5,0.06)", border: "1px solid rgba(0,200,5,0.2)", borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎁</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Referral Program</div>
        <div style={{ fontSize: 13, color: T2 }}>Earn rewards for every trader you bring to ERROR404</div>
      </div>

      <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T2, marginBottom: 6 }}>Your Referral Code</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: G, fontFamily: "monospace", marginBottom: 10 }}>{code}</div>
        <div style={{ fontSize: 11, color: T2, marginBottom: 6 }}>Your Link</div>
        <div style={{ fontSize: 11, color: T2, fontFamily: "monospace", wordBreak: "break-all", background: "rgba(255,255,255,0.03)", padding: 10, borderRadius: 9, marginBottom: 10 }}>{link}</div>
        <button onClick={() => navigator.clipboard.writeText(link)} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: G, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Copy Link
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[["Referrals", "0"], ["Earned", "$0.00"], ["Rank", "—"]].map(([l, v]) => (
          <div key={l} style={{ background: S, border: `1px solid ${B}`, borderRadius: 12, padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: T3, textTransform: "uppercase", letterSpacing: ".05em" }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: G, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>How It Works</div>
        {[
          ["1", "Share your link with other traders"],
          ["2", "They sign up and start trading"],
          ["3", "You earn a % of their trading fees"],
          ["4", "Rewards paid in ETH automatically"],
        ].map(([n, t]) => (
          <div key={n} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(0,200,5,0.12)", border: "1px solid rgba(0,200,5,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: G, flexShrink: 0 }}>{n}</div>
            <div style={{ fontSize: 12, color: T2, lineHeight: 1.6 }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
