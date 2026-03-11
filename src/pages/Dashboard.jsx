import { useState } from "react";

import { Home } from "lucide-react";
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
import {
  Ticket,
  Users,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const ticketTrend = [
  { day: "Mon", open: 42, closed: 28 },
  { day: "Tue", open: 58, closed: 35 },
  { day: "Wed", open: 35, closed: 48 },
  { day: "Thu", open: 70, closed: 52 },
  { day: "Fri", open: 55, closed: 60 },
  { day: "Sat", open: 30, closed: 40 },
  { day: "Sun", open: 25, closed: 38 },
];

const monthlyData = [
  { month: "Sep", tickets: 320 },
  { month: "Oct", tickets: 480 },
  { month: "Nov", tickets: 390 },
  { month: "Dec", tickets: 520 },
  { month: "Jan", tickets: 610 },
  { month: "Feb", tickets: 540 },
];

const statusData = [
  { name: "Open", value: 45, color: "#f87171" },
  { name: "In Progress", value: 30, color: "#fb923c" },
  { name: "Closed", value: 25, color: "#34d399" },
];

const recentTickets = [
  {
    id: "AMS083173",
    site: "NHSBT FILTON (MSC)",
    assignee: "Rukesh",
    duration: "0.07h",
    date: "20/02/2026",
  },
  {
    id: "AMS083105",
    site: "WILLIAM HARVEY HPL",
    assignee: "Abdul_Karem",
    duration: "3.9h",
    date: "19/02/2026",
  },
  {
    id: "AMS083101",
    site: "CHARING CROSS HOSPITAL",
    assignee: "Abdul_Karem",
    duration: "0.67h",
    date: "19/02/2026",
  },
  {
    id: "AMS082861",
    site: "JAMES PAGET HOSPITAL",
    assignee: "Abdul_Karem",
    duration: "0.97h",
    date: "12/02/2026",
  },
  {
    id: "AMS082820",
    site: "ALDER HEY CHILDRENS",
    assignee: "Rukesh",
    duration: "0.07h",
    date: "11/02/2026",
  },
];

const topAssignees = [
  { name: "Abdul_Karem", tickets: 842, pct: 49 },
  { name: "Wahida", tickets: 531, pct: 31 },
  { name: "Rukesh", tickets: 345, pct: 20 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1e2436] border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <p className="text-sm font-semibold capitalize text-slate-800 dark:text-white">
            {p.name}: <span className="font-bold">{p.value}</span>
          </p>
        </div>
      ))}
    </div>
  );
};

function StatCard({
  icon: StatIcon,
  label,
  value,
  change,
  positive,
  color,
  sparkData,
}) {
  return (
    <div className="bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 p-5 hover:shadow-lg hover:shadow-slate-100/80 dark:hover:shadow-black/20 transition-all duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: color + "18" }}
          >
            <StatIcon size={20} style={{ color }} />
          </div>
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
              positive
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
        <p className="text-2xl font-bold text-slate-800 dark:text-white">
          {value}
        </p>
        <p className="text-xs text-slate-400 mt-1 mb-3">{label}</p>
      </div>
      <div className="h-10 mt-auto">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
  const [chartRange, setChartRange] = useState("This Week");

  const stats = [
    {
      icon: Ticket,
      label: "Total Tickets",
      value: "1,718",
      change: "12.5%",
      positive: true,
      color: "#3b82f6",
      sparkData: [
        { v: 30 },
        { v: 55 },
        { v: 40 },
        { v: 70 },
        { v: 55 },
        { v: 85 },
        { v: 70 },
      ],
    },
    {
      icon: Clock,
      label: "Open Tickets",
      value: "1,024",
      change: "8.2%",
      positive: false,
      color: "#f87171",
      sparkData: [
        { v: 60 },
        { v: 75 },
        { v: 55 },
        { v: 80 },
        { v: 65 },
        { v: 90 },
        { v: 75 },
      ],
    },
    {
      icon: CheckCircle,
      label: "Closed Tickets",
      value: "694",
      change: "18.7%",
      positive: true,
      color: "#34d399",
      sparkData: [
        { v: 20 },
        { v: 35 },
        { v: 28 },
        { v: 45 },
        { v: 38 },
        { v: 55 },
        { v: 48 },
      ],
    },
    {
      icon: Users,
      label: "Active Customers",
      value: "248",
      change: "4.1%",
      positive: true,
      color: "#a78bfa",
      sparkData: [
        { v: 40 },
        { v: 50 },
        { v: 45 },
        { v: 60 },
        { v: 52 },
        { v: 65 },
        { v: 58 },
      ],
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Home size={12} />
        <span>Home</span>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          Dashboard
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          AMS Ticket overview and analytics
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ticket Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-bold text-slate-800 dark:text-white">
                Ticket Trends
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Open vs Closed tickets
              </p>
            </div>
            <select
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#242938] text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2d3345] transition-colors"
            >
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={210} minWidth={1} minHeight={1}>
            <LineChart
              data={ticketTrend}
              margin={{ top: 5, right: 5, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.12)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "rgba(148,163,184,0.1)", strokeWidth: 2 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="open"
                stroke="#f87171"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="closed"
                stroke="#34d399"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Donut */}
        <div className="bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm flex flex-col">
          <p className="font-bold text-slate-800 dark:text-white mb-1">
            Ticket Status
          </p>
          <p className="text-xs text-slate-400 mb-6">Current distribution</p>
          <div className="flex-1 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={160} minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 mt-6">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {s.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {s.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Volume */}
        <div className="bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
          <p className="font-bold text-slate-800 dark:text-white mb-1">
            Monthly Volume
          </p>
          <p className="text-xs text-slate-400 mb-6">Tickets per month</p>
          <ResponsiveContainer width="100%" height={160} minWidth={1} minHeight={1}>
            <BarChart
              data={monthlyData}
              barSize={12}
              margin={{ top: 0, right: 0, bottom: 0, left: -25 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.12)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(148,163,184,0.05)" }}
              />
              <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Tickets + Top Assignees */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-slate-800 dark:text-white">
                  Recent Tickets
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Latest open AMS tickets
                </p>
              </div>
              <button className="text-xs text-blue-500 hover:text-blue-600 font-bold transition-colors">
                View all →
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    {["Ticket ID", "Site", "Assignee", "Date", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left font-bold text-slate-400 pb-3 pr-4 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {recentTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="group hover:bg-slate-50 dark:hover:bg-white/3 transition-colors"
                    >
                      <td className="py-3 pr-4 font-mono font-bold text-blue-500 group-hover:scale-105 transition-transform origin-left inline-block">
                        {t.id}
                      </td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                        {t.site}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                        {t.assignee}
                      </td>
                      <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                        {t.date}
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 font-bold text-[10px] border border-red-100 dark:border-red-500/20">
                          Open
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Assignees */}
          <div className="w-full md:w-64 flex flex-col">
            <p className="font-bold text-slate-800 dark:text-white mb-1">
              Top Performers
            </p>
            <p className="text-xs text-slate-400 mb-6">Efficiency stats</p>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {topAssignees.map((a) => (
                <div key={a.name} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0 uppercase">
                        {a.name[0]}
                      </div>
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate max-w-[80px]">
                        {a.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {a.tickets} tks
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-linear-to-r from-blue-500 to-indigo-400 shadow-[0_0_8px_rgba(59,130,246,0.3)] transition-all duration-1000"
                      style={{ width: `${a.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
