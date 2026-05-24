import React, { useState } from "react";
import { Globe, Shield, AlertTriangle, Search, ExternalLink } from "lucide-react";
import { getThreatIntel, checkExtension } from "../api";
import { usePolling } from "../hooks/usePolling";
import { Card, SectionTitle, ThreatLevelBadge, Spinner } from "../components/ui";

export default function ThreatIntel() {
  const { data: intel } = usePolling(getThreatIntel, 60000);
  const [extInput,  setExtInput]  = useState("");
  const [extResult, setExtResult] = useState(null);

  const handleCheckExt = async () => {
    if (!extInput) return;
    try { const r = await checkExtension(extInput.startsWith(".")?extInput:"."+extInput); setExtResult(r); }
    catch (e) { console.error(e); }
  };

  if (!intel) return <Spinner />;

  const IOC_SEV = { CRITICAL:"text-red-400 bg-red-500/10 border-red-500/20", HIGH:"text-orange-400 bg-orange-500/10 border-orange-500/20", MEDIUM:"text-amber-400 bg-amber-500/10 border-amber-500/20" };

  return (
    <div className="p-6 space-y-5">
      <div><h1 className="text-2xl font-bold text-white">Threat Intelligence</h1>
        <p className="text-slate-500 text-sm mt-0.5">IOC database · ransomware family profiles · extension reputation</p></div>

      {/* Stats banner */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Known Families", value:intel.total_families, icon:Shield },
          { label:"IOC Signatures", value:intel.total_iocs,     icon:AlertTriangle },
          { label:"Ext. Signatures",value:intel.known_extensions,icon:Globe },
        ].map(({label,value,icon:Icon}) => (
          <div key={label} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex items-center gap-4">
            <Icon size={18} className="text-cyan-400 shrink-0" />
            <div><p className="text-2xl font-bold font-mono text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p></div>
          </div>
        ))}
      </div>

      {/* Extension checker */}
      <Card glow>
        <SectionTitle>Extension Reputation Checker</SectionTitle>
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#0f1829] border border-[#1a2744] rounded-lg px-3">
            <Search size={14} className="text-slate-600" />
            <input className="bg-transparent flex-1 py-2.5 text-sm font-mono text-slate-200 outline-none placeholder:text-slate-700"
              value={extInput} onChange={e=>setExtInput(e.target.value)} placeholder=".locked or .txt …"
              onKeyDown={e=>e.key==="Enter"&&handleCheckExt()} />
          </div>
          <button onClick={handleCheckExt} className="px-4 py-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-sm font-semibold hover:bg-cyan-500/20 transition-all">
            Check
          </button>
        </div>
        {extResult && (
          <div className={`mt-3 p-4 rounded-lg border font-mono text-sm ${extResult.is_ransomware_ioc?"bg-red-500/5 border-red-500/25":"bg-emerald-500/5 border-emerald-500/25"}`}>
            <div className="flex items-center gap-3">
              <span className="font-bold text-white">{extResult.extension}</span>
              <ThreatLevelBadge level={extResult.is_ransomware_ioc?"CRITICAL":"LOW"} />
            </div>
            <p className={`text-xs mt-1 ${extResult.is_ransomware_ioc?"text-red-400":"text-emerald-400"}`}>{extResult.description}</p>
          </div>
        )}
      </Card>

      {/* Ransomware families */}
      <Card>
        <SectionTitle>Known Ransomware Family Profiles</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {Object.entries(intel.families || {}).map(([name, info]) => (
            <div key={name} className={`rounded-xl border p-4 ${info.severity==="CRITICAL"?"border-red-500/20 bg-red-500/3":"border-orange-500/20 bg-orange-500/3"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white font-mono">{name}</span>
                <ThreatLevelBadge level={info.severity || "HIGH"} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                <div><span className="text-slate-500">Year:</span> <span className="text-slate-300">{info.year}</span></div>
                <div><span className="text-slate-500">Ransom:</span> <span className="text-red-400">{info.ransom}</span></div>
                <div className="col-span-2"><span className="text-slate-500">Vector:</span> <span className="text-slate-300">{info.vector}</span></div>
                <div className="col-span-2"><span className="text-slate-500">Affected:</span> <span className="text-slate-300">{info.affected}</span></div>
                {info.extensions?.length > 0 && (
                  <div className="col-span-2 flex flex-wrap gap-1 mt-1">
                    {info.extensions.map(e=><span key={e} className="px-1.5 py-0.5 rounded bg-[#0f1829] border border-[#1a2744] text-red-400">{e}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* IOC list */}
      <Card>
        <SectionTitle>Indicators of Compromise (IOCs)</SectionTitle>
        <div className="space-y-2">
          {(intel.iocs || []).map((ioc,i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${IOC_SEV[ioc.severity]||"text-slate-400 bg-slate-500/5 border-slate-500/20"}`}>
              <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-black/30 shrink-0 uppercase mt-0.5">{ioc.type}</span>
              <div>
                <p className="text-xs font-mono font-bold">{ioc.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{ioc.desc}</p>
              </div>
              <span className={`ml-auto shrink-0 text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${IOC_SEV[ioc.severity]||""}`}>{ioc.severity}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-xs text-slate-600 font-mono text-right">Feed version {intel.feed_version} · Last updated {intel.last_updated}</div>
    </div>
  );
}
