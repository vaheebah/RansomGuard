import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Activity, Bell, BarChart3, Shield, ShieldAlert, Cpu, Database, Globe } from "lucide-react";

const links = [
  { to: "/",            icon: LayoutDashboard, label: "Dashboard"      },
  { to: "/monitor",     icon: Activity,        label: "Live Monitor"   },
  { to: "/alerts",      icon: Bell,            label: "Alerts"         },
  { to: "/analytics",   icon: BarChart3,       label: "Analytics"      },
  { to: "/threat-intel",icon: Globe,           label: "Threat Intel"   },
  { to: "/quarantine",  icon: Database,        label: "Quarantine"     },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-[#080d1a] border-r border-[#1a2744] flex flex-col shrink-0">
      <div className="p-6 border-b border-[#1a2744]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
            <ShieldAlert size={20} className="text-cyan-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide">RansomGuard</p>
            <p className="text-[10px] text-cyan-600 font-mono uppercase tracking-widest">AI · v2.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 shadow-[0_0_12px_rgba(0,245,255,0.08)]"
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/4"
              }`
            }>
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1a2744] space-y-2">
        <div className="flex items-center gap-2 px-2">
          <Cpu size={12} className="text-slate-600" />
          <span className="text-[10px] text-slate-600 font-mono">Information Security Project</span>
        </div>
        <div className="flex items-center gap-2 px-2">
          <Shield size={12} className="text-slate-600" />
          <span className="text-[10px] text-slate-600 font-mono">5 ML Models · Ensemble</span>
        </div>
      </div>
    </aside>
  );
}