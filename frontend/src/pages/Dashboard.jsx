import React, { useState } from "react";
import { Shield, ShieldAlert, Activity, CheckCircle2, AlertTriangle, Zap, Lock, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { getStatus, getStats } from "../api";
import { usePolling } from "../hooks/usePolling";
import { StatCard, Card, SectionTitle, ThreatBadge, ThreatLevelBadge, Spinner, RiskBar } from "../components/ui";

const fetchStatus = () => getStatus();
const fetchStats  = () => getStats();

const LEVEL_COLORS = { CRITICAL:"#ff3d6e", HIGH:"#f97316", MEDIUM:"#ffab00", LOW:"#00e676" };

export default function Dashboard() {
  const { data: status } = usePolling(fetchStatus, 3000);
  const { data: stats  } = usePolling(fetchStats,  4000);

  if (!status) return <Spinner />;

  const counts  = status.detection_counts || {};
  const total   = (counts.NORMAL || 0) + (counts.RANSOMWARE || 0);
  const rPct    = total > 0 ? Math.round((counts.RANSOMWARE / total) * 100) : 0;
  const timeline = stats?.timeline || [];
  const lvlDist  = stats?.level_distribution || {};

  const levelData = Object.entries(lvlDist).map(([k,v]) => ({ name: k, value: v, color: LEVEL_COLORS[k] }));

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Threat Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time ransomware detection · 5-model ensemble</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-mono font-bold ${
          status.monitoring?.running
            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
            : "border-slate-700 bg-slate-800/50 text-slate-500"
        }`}>
          <span className={`w-2 h-2 rounded-full ${status.monitoring?.running ? "bg-cyan-400 animate-pulse" : "bg-slate-600"}`} />
          {status.monitoring?.running ? "MONITORING LIVE" : "OFFLINE"}
        </div>
      </div>

      {/* Monitored folder banner */}
      {status.monitoring?.running && (
        <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 p-4 flex items-center gap-4">
          <Activity size={18} className="text-cyan-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-0.5">Monitored Path</p>
            <p className="text-sm font-mono text-cyan-300 truncate">{status.monitoring.folder}</p>
          </div>
          <div className="flex items-center gap-6 text-center shrink-0">
            <div><p className="text-lg font-bold font-mono text-white">{status.quarantine_count}</p><p className="text-[10px] text-slate-500">Quarantined</p></div>
            <div><p className="text-lg font-bold font-mono text-white">{status.total_alerts}</p><p className="text-[10px] text-slate-500">Alerts</p></div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Normal Events"    value={counts.NORMAL || 0}     subtitle="Benign detections"    accent="green"  icon={CheckCircle2} />
        <StatCard title="Threats Detected" value={counts.RANSOMWARE || 0} subtitle="Ransomware events"    accent="red"    icon={ShieldAlert}  pulse={counts.RANSOMWARE > 0} />
        <StatCard title="Threat Rate"      value={`${rPct}%`}             subtitle="Of all predictions"  accent="amber"  icon={TrendingUp} />
        <StatCard title="ML Predictions"   value={status.history_count}   subtitle="Total analyses"       accent="cyan"   icon={Zap} />
      </div>

      {/* Timeline chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2" glow>
          <SectionTitle>Confidence & Risk Score Timeline</SectionTitle>
          {timeline.length === 0
            ? <p className="text-slate-600 text-sm text-center py-10">Start monitoring to see data</p>
            : <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timeline} margin={{ top:5, right:10, left:0, bottom:5 }}>
                  <defs>
                    <linearGradient id="confG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00f5ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00f5ff" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="riskG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ff3d6e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff3d6e" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{fill:"#475569",fontSize:10,fontFamily:"JetBrains Mono"}} />
                  <YAxis domain={[0,100]} tick={{fill:"#475569",fontSize:10,fontFamily:"JetBrains Mono"}} />
                  <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,fontFamily:"JetBrains Mono",fontSize:11}} />
                  <Area type="monotone" dataKey="confidence"  name="Confidence(%)"  stroke="#00f5ff" strokeWidth={2} fill="url(#confG)" />
                  <Area type="monotone" dataKey="risk_score"  name="Risk Score"     stroke="#ff3d6e" strokeWidth={2} fill="url(#riskG)" />
                </AreaChart>
              </ResponsiveContainer>
          }
        </Card>

        {/* Threat level breakdown */}
        <Card>
          <SectionTitle>Threat Level Distribution</SectionTitle>
          {levelData.every(d => d.value === 0)
            ? <p className="text-slate-600 text-sm text-center py-10">No data yet</p>
            : <>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={levelData} margin={{top:5,right:5,left:0,bottom:5}}>
                    <XAxis dataKey="name" tick={{fill:"#475569",fontSize:10,fontFamily:"JetBrains Mono"}} />
                    <YAxis tick={{fill:"#475569",fontSize:9}} />
                    <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,fontFamily:"JetBrains Mono",fontSize:11}} />
                    <Bar dataKey="value" radius={[4,4,0,0]}>
                      {levelData.map((d,i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {levelData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400">{d.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20"><RiskBar value={d.value} max={Math.max(...levelData.map(x=>x.value),1)} /></div>
                        <span className="font-mono font-bold w-6 text-right" style={{color:d.color}}>{d.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
          }
        </Card>
      </div>

      {/* Threat level indicator */}
      <Card>
        <SectionTitle>Current System Threat Level</SectionTitle>
        <div className="flex items-center gap-4 flex-wrap">
          {["LOW","MEDIUM","HIGH","CRITICAL"].map((lvl, i) => {
            const thresholds = [0, 25, 50, 75];
            const active = rPct >= thresholds[i];
            const colors = {
              LOW:      { bg:"bg-emerald-500", text:"text-emerald-400", ring:"ring-emerald-500/30" },
              MEDIUM:   { bg:"bg-amber-400",   text:"text-amber-400",   ring:"ring-amber-400/30"   },
              HIGH:     { bg:"bg-orange-500",  text:"text-orange-400",  ring:"ring-orange-500/30"  },
              CRITICAL: { bg:"bg-red-500",     text:"text-red-400",     ring:"ring-red-500/30"     },
            }[lvl];
            return (
              <div key={lvl} className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  active ? `${colors.bg} ring-2 ${colors.ring} shadow-lg` : "bg-[#1a2744]"
                }`}>
                  <Shield size={20} className={active ? "text-white" : "text-slate-600"} />
                </div>
                <span className={`text-[11px] font-mono font-bold ${active ? colors.text : "text-slate-600"}`}>{lvl}</span>
              </div>
            );
          })}
          <div className="ml-auto text-right">
            <p className="text-5xl font-bold font-mono" style={{color: rPct>=75?"#ff3d6e":rPct>=50?"#f97316":rPct>=25?"#ffab00":"#00e676"}}>
              {rPct}%
            </p>
            <p className="text-xs text-slate-500 mt-1">threat rate</p>
          </div>
        </div>
        <div className="mt-4">
          <RiskBar value={rPct} />
        </div>
      </Card>
    </div>
  );
}
