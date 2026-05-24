import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar    from "./components/Sidebar";
import Dashboard  from "./pages/Dashboard";
import Monitor    from "./pages/Monitor";
import Alerts     from "./pages/Alerts";
import Analytics  from "./pages/Analytics";
import ThreatIntel from "./pages/ThreatIntel";
import Quarantine  from "./pages/Quarantine";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#050a14]">
        <Sidebar />
        <main className="flex-1 overflow-auto min-h-screen">
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/monitor"      element={<Monitor />} />
            <Route path="/alerts"       element={<Alerts />} />
            <Route path="/analytics"    element={<Analytics />} />
            <Route path="/threat-intel" element={<ThreatIntel />} />
            <Route path="/quarantine"   element={<Quarantine />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}