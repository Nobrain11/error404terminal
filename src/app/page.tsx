import Link from "next/link";

export default function Home() {
  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>
        ERROR<span style={{ color: "#00C805" }}>404</span> Terminal
      </h1>
      <p style={{ color: "#8e8e93" }}>The best trading terminal on Robinhood Chain</p>
      <Link href="/terminal" style={{ background: "#00C805", color: "#000", padding: "12px 32px", borderRadius: 12, fontWeight: 700, textDecoration: "none" }}>
        Open Terminal
      </Link>
    </main>
  );
}
