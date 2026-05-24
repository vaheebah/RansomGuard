
import React, { useState } from "react";
import { Database, Shield, Lock, Hash, Clock } from "lucide-react";
import { getQuarantine, scanEntropy } from "../api";
import { usePolling } from "../hooks/usePolling";
import { Card, SectionTitle, Spinner, RiskBar } from "../components/ui";

export default function Quarantine() {
  const { data: items } = usePolling(getQuarantine, 5000);
  const [scanPath,   setScanPath]   = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanning,   setScanning]   = useState(false);

  const handleScan = async () => {
    if (!scanPath) return;
    setScanning(true);
    try { const r = await scanEntropy(scanPath); setScanResult(r); }
    catch (e) { setScanResult({ error: "Could not scan file — check path and permissions" }); }
    finally { setScanning(false); }
  };

  if (!items) return <Spinner />;

  const labelColor = { ENCRYPTED:"text-red-400", COMPRESSED:"text-amber-400", NORMAL:"text-emerald-400" };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Quarantine Vault</h1>
        <p className="text-slate-500 text-sm mt-0.5">Isolated suspicious files · SHA-256 hashing · entropy analysis scanner</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-4">
          <Database size={20} className="text-red-400" />
          <div>
            <p className="text-3xl font-bold font-mono text-red-400">{items.length}</p>
            <p className="text-xs text-slate-500">Files Quarantined</p>
          </div>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex items-center gap-4">
          <Shield size={20} className="text-cyan-400" />
          <div>
            <p className="text-3xl font-bold font-mono text-cyan-400">{items.filter(i=>!i.restored).length}</p>
            <p className="text-xs text-slate-500">Still Isolated</p>
          </div>
        </div>
      </div>

      {/* Entropy scanner */}
      <Card glow>
        <SectionTitle>File Entropy Scanner</SectionTitle>
        <p className="text-xs text-slate-500 mb-3">Enter a file path to scan its entropy. Encrypted files typically score &gt;7.2/8.0 (Shannon entropy).</p>
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#0f1829] border border-[#1a2744] rounded-lg px-3">
            <Lock size={14} className="text-slate-600" />
            <input className="bg-transparent flex-1 py-2.5 text-sm font-mono text-slate-200 outline-none placeholder:text-slate-700"
              value={scanPath} onChange={e=>setScanPath(e.target.value)}
              placeholder="C:\TestFolder\file.txt or ~/file.txt"
              onKeyDown={e=>e.key==="Enter"&&handleScan()} />
          </div>
          <button onClick={handleScan} disabled={scanning}
            className="px-4 py-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-sm font-semibold hover:bg-cyan-500/20 transition-all disabled:opacity-40">
            {scanning ? "Scanning…" : "Scan Entropy"}
          </button>
        </div>

        {scanResult && !scanResult.error && (
          <div className="mt-4 p-4 rounded-xl border border-[#1a2744] bg-[#0a0f1e]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm text-slate-300 truncate">{scanResult.path}</span>
              <span className={`font-bold font-mono text-sm ${labelColor[scanResult.label]||"text-slate-400"}`}>{scanResult.label}</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-3xl font-bold font-mono text-white">{scanResult.entropy}</span>
              <div className="text-xs text-slate-500">
                <p>Shannon Entropy</p>
                <p>Max possible: 8.0 bits/byte</p>
                <p className={labelColor[scanResult.label]}>{scanResult.pct}% of maximum entropy</p>
              </div>
            </div>
            <RiskBar value={scanResult.pct} />
            <div className="mt-3 text-xs text-slate-500 font-mono">
              <span className="text-emerald-400">0–5.0:</span> Normal text/binary &nbsp;
              <span className="text-amber-400">5.0–6.5:</span> Compressed &nbsp;
              <span className="text-red-400">6.5–7.2:</span> Likely compressed &nbsp;
              <span className="text-red-500 font-bold">7.2–8.0:</span> Encrypted
            </div>
          </div>
        )}
        {scanResult?.error && (
          <div className="mt-3 p-3 rounded-lg border border-red-500/25 bg-red-500/5 text-xs text-red-400 font-mono">{scanResult.error}</div>
        )}
      </Card>

      {/* Quarantine log */}
      <Card>
        <SectionTitle>Quarantine Log</SectionTitle>
        {items.length === 0
          ? <div className="text-center py-12">
              <Database size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-600 text-sm">No files quarantined yet</p>
              <p className="text-slate-700 text-xs mt-1">Files flagged by the ML engine will appear here</p>
            </div>
          : <div className="space-y-3">
              {items.map((item,i) => (
                <div key={i} className="rounded-xl border border-[#1a2744] bg-[#0a0f1e] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-white">{item.filename}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-600 font-mono">
                      <Clock size={11}/>{new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="flex items-start gap-2">
                      <Hash size={11} className="text-slate-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-slate-500">SHA-256</p>
                        <p className="text-slate-400 break-all">{item.hash_sha256}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Original Path</p>
                      <p className="text-slate-400 break-all">{item.original}</p>
                      <p className="text-amber-400 mt-1">Reason: {item.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  );
}
