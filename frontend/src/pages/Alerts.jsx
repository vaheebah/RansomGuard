import React from "react";
import { ShieldAlert, ShieldCheck, Clock, AlertOctagon, Bell } from "lucide-react";
import { getAlerts, getHistory } from "../api";
import { usePolling } from "../hooks/usePolling";
import { Card, SectionTitle, ThreatBadge, ThreatLevelBadge, Spinner, RiskBar } from "../components/ui";

export default function Alerts() {
  const { data: alerts  } = usePolling(getAlerts,  3000);
  const { data: history } = usePolling(getHistory,  4000);

  if (!alerts) return <Spinner />;

  const normal = (history||[]).filter(h=>h.label==="NORMAL");
  const critical = alerts.filter(a=>a.threat_level==="CRITICAL");

  return (
    <div className="p-6 space-y-5">
      <div><h1 className="text-2xl font-bold text-white">Alerts & Detections</h1>
        <p className="text-slate-500 text-sm mt-0.5">All threat events with ML confidence scores and behavioral indicators</p></div>

      {/* Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label:"CRITICAL Threats",  value:critical.length,       color:"red",    icon:AlertOctagon },
          { label:"All Threats",       value:alerts.length,         color:"orange", icon:ShieldAlert  },
          { label:"Normal Events",     value:normal.length,         color:"green",  icon:ShieldCheck  },
          { label:"Total Predictions", value:(history||[]).length,  color:"cyan",   icon:Bell         },
        ].map(({label,value,color,icon:Icon}) => (
          <div key={label} className={`rounded-xl border p-4 flex items-center gap-4
            border-${color==="orange"?"orange":color==="red"?"red":color==="green"?"emerald":"cyan"}-500/20
            bg-${color==="orange"?"orange":color==="red"?"red":color==="green"?"emerald":"cyan"}-500/5`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center
              bg-${color==="orange"?"orange":color==="red"?"red":color==="green"?"emerald":"cyan"}-500/10`}>
              <Icon size={18} className={`text-${color==="orange"?"orange":color==="red"?"red":color==="green"?"emerald":"cyan"}-400`} />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active threat alerts */}
      {alerts.length > 0 && (
        <Card>
          <SectionTitle>⚠ Active Ransomware Alerts</SectionTitle>
          <div className="space-y-3">
            {alerts.map((a,i) => (
              <div key={i} className={`rounded-xl border p-4 ${
                a.threat_level==="CRITICAL" ? "border-red-500/30 bg-red-500/5" : "border-orange-500/20 bg-orange-500/5"
              }`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <ShieldAlert size={18} className={a.threat_level==="CRITICAL"?"text-red-400":"text-orange-400"} />
                    <div>
                      <ThreatLevelBadge level={a.threat_level} />
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        ML Confidence: <span className="text-red-400 font-bold">{a.confidence}%</span>
                        &nbsp;|&nbsp;Risk Score: <span className="text-orange-400 font-bold">{a.risk_score}/100</span>
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-slate-600 font-mono shrink-0">
                    <Clock size={11}/>{a.timestamp}
                  </span>
                </div>
                <div className="mb-2"><RiskBar value={a.risk_score} /></div>
                {a.indicators?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.indicators.map((ind,j) => (
                      <span key={j} className="text-[10px] font-mono px-2 py-1 rounded bg-[#0f1829] border border-[#1a2744] text-slate-400">
                        {ind.feature}: <span className="text-red-400">{ind.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Full history */}
      <Card>
        <SectionTitle>Detection History</SectionTitle>
        {!(history?.length)
          ? <p className="text-slate-600 text-sm text-center py-8">No detections yet</p>
          : <div className="space-y-1 max-h-96 overflow-y-auto">
              {history.map((h,i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/2 border border-transparent hover:border-[#1a2744] transition-all">
                  <div className="flex items-center gap-3">
                    <ThreatBadge label={h.label} />
                    <ThreatLevelBadge level={h.threat_level || "LOW"} />
                    <span className="text-xs text-slate-600 font-mono">
                      Conf: <span className={h.label==="RANSOMWARE"?"text-red-400":"text-emerald-400"}>{h.confidence}%</span>
                      {h.risk_score !== undefined && <> | Risk: <span className="text-amber-400">{h.risk_score}</span></>}
                    </span>
                  </div>
                  <span className="text-xs text-slate-700 font-mono">{h.ts_display || h.timestamp}</span>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  );
}