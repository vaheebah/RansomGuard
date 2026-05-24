import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { getStats } from "../api";
import { usePolling } from "../hooks/usePolling";
import { Card, SectionTitle, Spinner } from "../components/ui";

const COLORS = ["#6366f1","#00f5ff","#f59e0b","#ff3d6e","#a78bfa"];
const PIE_COLORS = ["#00e676","#ff3d6e"];

const TTStyle = { background:"#0a0f1e", border:"1px solid #1a2744", borderRadius:8, fontFamily:"JetBrains Mono", fontSize:11, color:"#e2e8f0" };

export default function Analytics() {
  const { data: stats } = usePolling(getStats, 6000);
  if (!stats) return <Spinner />;

  const metrics  = stats.model_metrics || [];
  const counts   = stats.detection_counts || {};
  const timeline = stats.timeline || [];
  const total    = (counts.NORMAL||0) + (counts.RANSOMWARE||0);

  const barData = metrics.map(m => ({
    name: m.name.replace("Neural Network (MLP)","Neural Net").replace("Gradient Boosting","Grad.Boost"),
    Accuracy: m.accuracy, Precision: m.precision, Recall: m.recall, F1: m.f1, AUC: m.auc,
  }));

  const rf = metrics.find(m => m.name === "Random Forest");
  const radarData = rf ? [
    { metric:"Accuracy",  value:rf.accuracy  },
    { metric:"Precision", value:rf.precision },
    { metric:"Recall",    value:rf.recall    },
    { metric:"F1 Score",  value:rf.f1        },
    { metric:"AUC",       value:rf.auc       },
  ] : [];

  const pieData = [
    { name:"Normal",     value:counts.NORMAL||0     },
    { name:"Ransomware", value:counts.RANSOMWARE||0 },
  ].filter(d=>d.value>0);

  const cvData = metrics.filter(m=>m.cv_f1_mean>0).map(m=>({
    name: m.name.replace("Neural Network (MLP)","Neural Net").replace("Gradient Boosting","Grad.Boost"),
    "CV F1 Mean": m.cv_f1_mean, "CV F1 Std": m.cv_f1_std,
  }));

  return (
    <div className="p-6 space-y-5">
      <div><h1 className="text-2xl font-bold text-white">Analytics & ML Performance</h1>
        <p className="text-slate-500 text-sm mt-0.5">5-model ensemble evaluation · cross-validation · AUC-ROC analysis</p></div>

      {/* Metrics table */}
      {metrics.length > 0 && (
        <Card>
          <SectionTitle>Model Comparison — All Metrics</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-[#1a2744]">
                  {["Model","Accuracy","Precision","Recall","F1 Score","AUC-ROC","CV F1 ±Std"].map(h=>(
                    <th key={h} className="text-left py-2 px-3 text-[10px] text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m,i)=>(
                  <tr key={i} className={`border-b border-[#1a2744]/40 hover:bg-white/2 ${m.name==="Random Forest"?"bg-cyan-500/3":""}`}>
                    <td className="py-3 px-3 font-semibold text-white">
                      {m.name}
                      {m.name==="Random Forest" && <span className="ml-2 text-[9px] bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded font-bold">MAIN</span>}
                    </td>
                    {[m.accuracy,m.precision,m.recall,m.f1,m.auc].map((v,j)=>(
                      <td key={j} className={`py-3 px-3 font-bold ${v>=95?"text-emerald-400":v>=85?"text-cyan-400":v>=75?"text-amber-400":"text-red-400"}`}>{v}%</td>
                    ))}
                    <td className="py-3 px-3 text-slate-400">{m.cv_f1_mean}% ±{m.cv_f1_std}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Bar chart + Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {barData.length > 0 && (
          <Card>
            <SectionTitle>Performance Comparison (Bar)</SectionTitle>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} margin={{top:5,right:5,left:0,bottom:5}}>
                <XAxis dataKey="name" tick={{fill:"#64748b",fontSize:9,fontFamily:"JetBrains Mono"}} />
                <YAxis domain={[0,105]} tick={{fill:"#64748b",fontSize:9}} />
                <Tooltip contentStyle={TTStyle} />
                <Legend wrapperStyle={{color:"#94a3b8",fontFamily:"JetBrains Mono",fontSize:10}} />
                {["Accuracy","Precision","Recall","F1","AUC"].map((k,i)=>(
                  <Bar key={k} dataKey={k} fill={COLORS[i]} radius={[3,3,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {radarData.length > 0 && (
          <Card>
            <SectionTitle>Random Forest — Metric Radar</SectionTitle>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#1a2744" />
                <PolarAngleAxis dataKey="metric" tick={{fill:"#94a3b8",fontSize:10,fontFamily:"JetBrains Mono"}} />
                <Radar dataKey="value" stroke="#00f5ff" fill="#00f5ff" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Cross-validation + Pie */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {cvData.length > 0 && (
          <Card>
            <SectionTitle>5-Fold Cross-Validation F1 Score</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cvData} margin={{top:5,right:5,left:0,bottom:5}}>
                <XAxis dataKey="name" tick={{fill:"#64748b",fontSize:9,fontFamily:"JetBrains Mono"}} />
                <YAxis domain={[0,105]} tick={{fill:"#64748b",fontSize:9}} />
                <Tooltip contentStyle={TTStyle} />
                <Bar dataKey="CV F1 Mean" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="CV F1 Std"  fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {pieData.length > 0 ? (
          <Card>
            <SectionTitle>Live Detection Distribution</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={{stroke:"#334155"}}>
                  {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend wrapperStyle={{color:"#94a3b8",fontFamily:"JetBrains Mono",fontSize:11}} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card><p className="text-slate-600 text-sm text-center py-16">Start monitoring to see live distribution</p></Card>
        )}
      </div>

      {/* Timeline line chart */}
      {timeline.length > 0 && (
        <Card>
          <SectionTitle>Confidence vs Risk Score — Live Timeline</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeline} margin={{top:5,right:10,left:0,bottom:5}}>
              <XAxis dataKey="time" tick={{fill:"#475569",fontSize:10,fontFamily:"JetBrains Mono"}} />
              <YAxis domain={[0,100]} tick={{fill:"#475569",fontSize:10}} />
              <Tooltip contentStyle={TTStyle} />
              <Legend wrapperStyle={{color:"#94a3b8",fontFamily:"JetBrains Mono",fontSize:11}} />
              <Line type="monotone" dataKey="confidence"  name="ML Confidence(%)" stroke="#00f5ff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="risk_score"  name="Rule Risk Score"  stroke="#ff3d6e" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {metrics.length===0 && (
        <Card><p className="text-slate-600 text-sm text-center py-8">
          No metrics found. Run <span className="font-mono text-cyan-400">python train_model.py</span> first.
        </p></Card>
      )}
    </div>
  );
}