import React, { useState } from "react";
import { Play, Square, RefreshCw, Folder, AlertOctagon, Cpu, HardDrive } from "lucide-react";
import { getLogs, getStatus, startMonitor, stopMonitor, predictNow } from "../api";
import { usePolling } from "../hooks/usePolling";
import { Card, SectionTitle, ThreatBadge, ThreatLevelBadge, Spinner, RiskBar } from "../components/ui";

const SEV_STYLE = {
  CRITICAL:"text-red-400 bg-red-500/10 border border-red-500/20",
  HIGH:"text-orange-400 bg-orange-500/10 border border-orange-500/20",
  WARN:"text-amber-400 bg-amber-500/10 border border-amber-500/20",
  INFO:"text-slate-400","":"text-slate-400",
};

export default function Monitor() {
  const [folder,  setFolder]  = useState(navigator.platform.startsWith("Win") ? "C:\\TestFolder" : "~/TestFolder");
  const [busy,    setBusy]    = useState(false);
  const [latest,  setLatest]  = useState(null);
  const [scanning,setScanning]= useState(false);

  const { data: status, refresh: rStatus } = usePolling(getStatus, 3000);
  const { data: logs,   refresh: rLogs   } = usePolling(getLogs,   2000);

  const mon = status?.monitoring || {};

  const handleStart = async () => { setBusy(true); try { await startMonitor(folder); } finally { setBusy(false); rStatus(); }};
  const handleStop  = async () => { setBusy(true); try { await stopMonitor(); }        finally { setBusy(false); rStatus(); }};
  const handlePredict = async () => {
    setScanning(true);
    try { const r = await predictNow(); setLatest(r); }
    catch { alert("Start monitoring first."); }
    finally { setScanning(false); }
  };

  if (!status) return <Spinner />;

  return (
    <div className="p-6 space-y-5">
      <div><h1 className="text-2xl font-bold text-white">Live Monitor</h1>
        <p className="text-slate-500 text-sm mt-0.5">Real-time folder surveillance with behavioral analysis & entropy scanning</p></div>

      {/* Control panel */}
      <Card glow>
        <SectionTitle>Surveillance Control</SectionTitle>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#0f1829] border border-[#1a2744] rounded-lg px-3">
            <Folder size={14} className="text-slate-600 shrink-0" />
            <input className="bg-transparent flex-1 py-2.5 text-sm font-mono text-slate-200 outline-none placeholder:text-slate-700"
              value={folder} onChange={e => setFolder(e.target.value)} placeholder="Folder to monitor…" />
          </div>
          <div className="flex gap-2 shrink-0">
            {mon.running
              ? <button onClick={handleStop} disabled={busy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/25 text-sm font-semibold hover:bg-red-500/20 transition-all disabled:opacity-40">
                  <Square size={14} />Stop
                </button>
              : <button onClick={handleStart} disabled={busy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-sm font-semibold hover:bg-cyan-500/20 transition-all disabled:opacity-40">
                  <Play size={14} />Start
                </button>
            }
            <button onClick={handlePredict} disabled={!mon.running || scanning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/25 text-sm font-semibold hover:bg-purple-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <RefreshCw size={14} className={scanning?"animate-spin":""} />
              {scanning ? "Scanning…" : "Predict Now"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${mon.running?"bg-cyan-400 animate-pulse":"bg-slate-700"}`} />
          <span className={`text-sm font-mono ${mon.running?"text-cyan-400":"text-slate-600"}`}>
            {mon.running ? `Monitoring: ${mon.folder}` : "Not active — enter folder path and click Start"}
          </span>
        </div>
      </Card>

      {/* Latest prediction card */}
      {latest && !latest.error && (
        <Card className={latest.label==="RANSOMWARE" ? "border-red-500/30" : "border-emerald-500/20"}>
          <SectionTitle>Latest ML Prediction</SectionTitle>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <ThreatBadge label={latest.label} size="lg" />
              <div className="flex items-center gap-6 text-sm font-mono">
                <div><p className="text-slate-500 text-xs">Confidence</p>
                  <p className="text-2xl font-bold text-white">{latest.confidence}%</p></div>
                <div><p className="text-slate-500 text-xs">Risk Score</p>
                  <p className="text-2xl font-bold text-white">{latest.risk_score}</p></div>
                <div><p className="text-slate-500 text-xs">Threat Level</p>
                  <ThreatLevelBadge level={latest.threat_level} /></div>
              </div>
              {latest.top_indicators?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Top Indicators</p>
                  {latest.top_indicators.map((ind,i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-mono">
                      <AlertOctagon size={11} className={
                        ind.severity==="critical"?"text-red-400":ind.severity==="high"?"text-orange-400":"text-amber-400"} />
                      <span className="text-slate-300">{ind.feature}:</span>
                      <span className="text-white font-bold">{ind.value}</span>
                      <span className="text-slate-500">— {ind.note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Ensemble probabilities */}
            {latest.ensemble_probas && Object.keys(latest.ensemble_probas).length > 0 && (
              <div className="bg-[#0f1829] rounded-xl border border-[#1a2744] p-4 min-w-48">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Ensemble Vote</p>
                {Object.entries(latest.ensemble_probas).map(([name,pct]) => (
                  <div key={name} className="mb-2.5">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400 truncate max-w-32">{name}</span>
                      <span className={pct>=50?"text-red-400":"text-emerald-400"}>{pct}%</span>
                    </div>
                    <RiskBar value={pct} />
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Feature grid */}
          {latest.features && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {Object.entries(latest.features).slice(0,12).map(([k,v]) => (
                <div key={k} className="bg-[#0f1829] border border-[#1a2744] rounded-lg p-2">
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider leading-tight">{k.replace(/_/g," ")}</p>
                  <p className="text-xs font-mono text-cyan-400 font-bold mt-0.5">{typeof v==="number"?v.toFixed(2):v}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Event log */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle className="mb-0">Live Event Log</SectionTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-mono">{logs?.length || 0} events</span>
            <button onClick={rLogs} className="text-slate-600 hover:text-cyan-400 transition-colors"><RefreshCw size={13} /></button>
          </div>
        </div>
        <div className="bg-[#050a14] rounded-xl border border-[#1a2744] h-80 overflow-y-auto font-mono text-xs p-3 space-y-0.5">
          {!logs?.length
            ? <p className="text-slate-700 text-center py-8">No events — start monitoring</p>
            : logs.map((log,i) => (
                <div key={i} className={`flex items-start gap-2 px-2 py-1 rounded ${log.severity==="CRITICAL"?"bg-red-500/5":log.severity==="HIGH"?"bg-orange-500/5":""}`}>
                  <span className="text-slate-700 shrink-0 w-16">{log.timestamp}</span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${SEV_STYLE[log.severity]||SEV_STYLE[""]}`}>
                    {log.event_type}
                  </span>
                  <span className="text-slate-400 break-all leading-relaxed">{log.message}</span>
                  {log.extra?.entropy > 0 && (
                    <span className={`shrink-0 text-[9px] px-1 rounded ml-auto ${log.extra.entropy>7?"text-red-400 bg-red-500/10":"text-slate-600"}`}>
                      H={log.extra.entropy}
                    </span>
                  )}
                </div>
              ))
          }
        </div>
      </Card>
    </div>
  );
}