import React from "react";

export function ThreatBadge({ label, size = "sm" }) {
  const isR = label === "RANSOMWARE";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold font-mono uppercase tracking-wider border
      ${size === "lg" ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs"}
      ${isR ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
      <span className={`rounded-full ${size === "lg" ? "w-2 h-2" : "w-1.5 h-1.5"} ${isR ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`} />
      {label}
    </span>
  );
}

export function ThreatLevelBadge({ level }) {
  const map = {
    CRITICAL: "bg-red-500/15 text-red-300 border-red-500/30",
    HIGH:     "bg-orange-500/15 text-orange-300 border-orange-500/30",
    MEDIUM:   "bg-amber-500/15 text-amber-300 border-amber-500/30",
    LOW:      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase border ${map[level] || map.LOW}`}>
      {level}
    </span>
  );
}

export function StatCard({ title, value, subtitle, accent = "cyan", icon: Icon, pulse }) {
  const c = {
    cyan:   { border:"border-cyan-500/20",   text:"text-cyan-400",    bg:"bg-cyan-500/5",    glow:"shadow-[0_0_20px_rgba(0,245,255,0.08)]"  },
    red:    { border:"border-red-500/20",    text:"text-red-400",     bg:"bg-red-500/5",     glow:"shadow-[0_0_20px_rgba(255,61,110,0.1)]"  },
    green:  { border:"border-emerald-500/20",text:"text-emerald-400", bg:"bg-emerald-500/5", glow:"shadow-[0_0_20px_rgba(0,230,118,0.08)]"  },
    amber:  { border:"border-amber-500/20",  text:"text-amber-400",   bg:"bg-amber-500/5",   glow:""  },
    purple: { border:"border-purple-500/20", text:"text-purple-400",  bg:"bg-purple-500/5",  glow:""  },
  }[accent] || {};
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} ${c.glow} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{title}</p>
        {Icon && <Icon size={15} className={c.text} />}
      </div>
      <p className={`text-3xl font-bold font-mono ${c.text} ${pulse ? "animate-pulse" : ""}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = "", glow }) {
  return (
    <div className={`rounded-xl border border-[#1a2744] bg-[#080d1a] p-5 ${glow ? "shadow-[0_0_30px_rgba(0,245,255,0.05)]" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, className="" }) {
  return <h2 className={`text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 ${className}`}>{children}</h2>;
}

export function Spinner({ size = "md" }) {
  const s = size === "sm" ? "w-5 h-5" : "w-8 h-8";
  return (
    <div className="flex items-center justify-center p-10">
      <div className={`${s} border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin`} />
    </div>
  );
}

export function RiskBar({ value, max = 100 }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 75 ? "#ff3d6e" : pct >= 50 ? "#ffab00" : pct >= 25 ? "#f59e0b" : "#00e676";
  return (
    <div className="w-full bg-[#1a2744] rounded-full h-1.5">
      <div className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}60` }} />
    </div>
  );
}