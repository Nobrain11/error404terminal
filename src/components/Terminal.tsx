"use client";
import { useState } from "react";
import DiscoverPage from "./pages/DiscoverPage";
import TradePage from "./pages/TradePage";
import PortfolioPage from "./pages/PortfolioPage";
import AlertsPage from "./pages/AlertsPage";
import SettingsPage from "./pages/SettingsPage";
import BottomNav from "./ui/BottomNav";
import Header from "./ui/Header";
import TickerTape from "./ui/TickerTape";
import RobinBot from "./ui/RobinBot";

export type Page = "discover" | "trade" | "portfolio" | "alerts" | "settings";

export default function Terminal() {
  const [page, setPage] = useState<Page>("discover");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0b", maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden" }}>
      <TickerTape />
      <Header />
      {page === "discover" && <DiscoverPage />}
      {page === "trade" && <TradePage />}
      {page === "portfolio" && <PortfolioPage />}
      {page === "alerts" && <AlertsPage />}
      {page === "settings" && <SettingsPage />}
      <RobinBot />
      <BottomNav current={page} onChange={setPage} />
    </div>
  );
}
