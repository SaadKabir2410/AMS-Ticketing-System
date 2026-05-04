import { useState } from "react";
import { Home, ArrowUpRight, ArrowDownRight } from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

function StatCard({ label, value, change, positive, color, sparkData }) {
  return (
    <div className="bg-white dark:bg-[#161920] rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 hover:shadow-lg hover:shadow-slate-100/80 dark:hover:shadow-black/20 transition-all duration-200 flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-start justify-between mb-4">
          <span
            className={`flex items-center gap-0.5 text-xs px-2 py-1 rounded-full ${positive
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
              : "bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400"
              }`}
          >
            {positive ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {change}
          </span>
        </div>
        <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
          {value}
        </p>
        <p className="text-xs text-slate-400 mt-1 mb-3">{label}</p>
      </div>
      <div className="h-10 mt-auto">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={1}
          minHeight={1}
        >
          <AreaChart
            data={sparkData}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient
                id={`g-${label.replace(/\s+/g, "")}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2}
              fill={`url(#g-${label.replace(/\s+/g, "")})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const stats = [
    //work later
  ];

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="flex flex-col gap-2 py-8 px-4 md:px-8 border-b border-slate-100 dark:border-slate-800/50">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1">
            <span>Home</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-pink-500">Dashboard</span>
          </nav>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">AMS Ticket overview and analytics</p>
        </div>

        <div className="p-4 md:p-8 space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* Maintenance Message */}
          <div className="flex flex-col items-center justify-center py-12 text-center p-6 select-none bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-slate-200/60 dark:border-slate-800/40">
            <div className="max-w-md p-6 flex flex-col items-center gap-3">
              <span className="text-sm font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 px-3 py-1 rounded-full">
                Maintenance Notice
              </span>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-snug tracking-tight">
                Sorry for our inconvience, Dashboard Page is Under the Maintenance.We are working on it. Thank you for your patience.
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
