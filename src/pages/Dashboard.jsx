import React, { useState, useEffect } from "react";
import {
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import {
  Mail, MessageSquare, ChevronRight, CheckCircle2,
  MoreHorizontal, Plus, Download, CreditCard,
  CheckSquare, Briefcase, CreditCard as CardIcon, ChevronLeft, Ticket
} from "lucide-react";
import dashboardApi from "../services/api/dashboardApi";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContextHook";

// ─── Card wrapper ─────────────────────────────────────────────────────────────
const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-800/60 ${className}`}>
    {children}
  </div>
);

// ─── Icon bubble ──────────────────────────────────────────────────────────────
const IconBubble = ({ bg, darkBg, color, children }) => (
  <div className={`w-10 h-10 rounded-xl ${bg} ${darkBg} flex items-center justify-center ${color}`}>
    {children}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour === 12) return "Good Noon";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    dashboardApi.getDashboardData().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fa] dark:bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-[#f4f6fa] dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200 transition-colors">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Overview</h1>
          </div>
        </div>

        {/* ── Banner ── */}
        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 flex items-start justify-between relative shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-1">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                    {getGreeting()}, {user?.name || user?.userName || "User"}!
                  </h3>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                    Here's what's happening with your projects today.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 transition-colors"
              >
                <MoreHorizontal size={20} className="rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Middle Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Recent Activities */}
          <Card className="lg:col-span-4 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <IconBubble bg="bg-orange-50" darkBg="dark:bg-orange-500/10" color="text-orange-500 dark:text-orange-400">
                <Briefcase size={20} />
              </IconBubble>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Recent Activities</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">last 2 weeks</p>
              </div>
            </div>
            <div className="flex-1 relative pl-3">
              <div className="absolute left-[27px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-6">
                {data.recentActivities.map((act) => (
                  <div key={act.id} className="relative flex items-start gap-4">
                    <div className="w-12 pt-0.5 text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{act.time}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-900 mt-1 relative z-10
                      ${act.type === "success" ? "border-teal-400" : act.type === "warning" ? "border-orange-400" : "border-indigo-400"}`}
                    />
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed pr-2">
                      {act.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* John's Issue */}
          <Card className="lg:col-span-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <IconBubble bg="bg-red-50" darkBg="dark:bg-red-500/10" color="text-red-500 dark:text-red-400">
                  <CheckSquare size={20} />
                </IconBubble>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">John's Issue</h3>
                  <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-indigo-500 w-1/3 rounded-full" />
                  </div>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                <Plus size={14} />
                New
              </button>
            </div>
            <div className="flex-1 space-y-4">
              {data.johnsIssue.map((issue) => (
                <div key={issue.id} className="flex items-start gap-3 group">
                  <div className="mt-0.5">
                    <input type="checkbox" defaultChecked={issue.checked} className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer accent-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-bold transition-all ${issue.checked ? "text-slate-400 dark:text-slate-600 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                      {issue.text}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">in {issue.days}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded flex items-center
                      ${issue.type === "New" ? "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10" :
                        issue.type === "Update" ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" :
                        issue.type === "Test" ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10" :
                        "text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"}`}>
                      {issue.type}
                    </span>
                    <button className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Waiting for Answer */}
          <Card className="lg:col-span-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <IconBubble bg="bg-pink-50" darkBg="dark:bg-pink-500/10" color="text-pink-500 dark:text-pink-400">
                  <MessageSquare size={20} />
                </IconBubble>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Waiting for an Answer</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Customer</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-between gap-4">
              {data.waitingForAnswer.map((u) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-700 object-cover bg-slate-50 dark:bg-slate-800" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{u.name}</h4>
                      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate w-24">{u.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">%{u.progress}</span>
                      <svg className="w-6 h-6 transform -rotate-90">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="text-slate-100 dark:text-slate-800" />
                        <circle cx="12" cy="12" r="10"
                          stroke={u.progress > 40 ? "#f59e0b" : u.progress > 20 ? "#f43f5e" : "#2dd4bf"}
                          strokeWidth="3" fill="none"
                          strokeDasharray="62.8"
                          strokeDashoffset={62.8 - (62.8 * u.progress) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <button className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <Mail size={12} className="text-indigo-400 dark:text-indigo-400" />
                      Send
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* My Wallet */}
          <Card className="lg:col-span-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <IconBubble bg="bg-indigo-50" darkBg="dark:bg-indigo-500/10" color="text-indigo-500 dark:text-indigo-400">
                  <CardIcon size={20} />
                </IconBubble>
                <h3 className="font-bold text-slate-900 dark:text-white">My Wallet</h3>
              </div>
              <button className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 shadow-sm transition-all">
                <CreditCard size={14} className="text-indigo-400" />
                Add New
              </button>
            </div>
            <div className="flex flex-col items-center">
              {/* Card widget */}
              <div className="w-full max-w-[280px] h-[160px] bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-5 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.5)] relative overflow-hidden text-white flex flex-col justify-between mb-6 transform hover:scale-105 transition-transform duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="flex justify-between items-center relative z-10">
                  <div className="w-10 h-7 bg-white/20 rounded flex items-center justify-center">
                    <div className="w-5 h-4 border border-white/50 rounded-sm bg-white/10" />
                  </div>
                  <div className="flex relative w-10 h-6">
                    <div className="w-6 h-6 rounded-full bg-red-500/80 absolute right-4 mix-blend-multiply" />
                    <div className="w-6 h-6 rounded-full bg-yellow-400/80 absolute right-0 mix-blend-multiply" />
                  </div>
                </div>
                <div className="relative z-10 text-center tracking-[0.2em] font-mono text-lg font-bold text-white/90 drop-shadow-md mt-2">
                  **** **** **** 1198
                </div>
                <div className="flex justify-between items-end relative z-10 font-mono">
                  <span className="text-xs uppercase font-medium">JOHN DOE</span>
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] opacity-70">valid thru</span>
                    <span className="text-xs">12/24</span>
                  </div>
                </div>
              </div>
              {/* Card list */}
              <div className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex justify-between items-center p-3 border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <span>Visa - 1134</span>
                  <div className="px-3 py-1 bg-slate-900 dark:bg-slate-950 text-white rounded-lg text-[10px]">Mastercard - 1198</div>
                </div>
                <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <span>Amex - 00002</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Top Seller */}
          <Card className="lg:col-span-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <IconBubble bg="bg-teal-50" darkBg="dark:bg-teal-500/10" color="text-teal-500 dark:text-teal-400">
                  <Briefcase size={20} />
                </IconBubble>
                <h3 className="font-bold text-slate-900 dark:text-white">Top Seller</h3>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg text-xs font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
                  Jun 3
                  <ChevronRight size={14} className="rotate-90 ml-1 opacity-50" />
                </button>
                <button className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <Download size={14} className="text-indigo-400" />
                  Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    {["#", "Image", "Name", "Sales", "Stock", "Price", "Store"].map((h) => (
                      <th key={h} className="px-4 pb-2 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.topSeller.map((item, i) => (
                    <tr key={i} className="bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors group">
                      <td className="px-4 py-3 rounded-l-xl text-xs font-black text-slate-900 dark:text-white">{item.id + 1}</td>
                      <td className="px-4 py-3">
                        <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover shadow-sm bg-white dark:bg-slate-700" />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{item.category}</p>
                      </td>
                      <td className="px-4 py-3 w-24">
                        <div className="h-6 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={item.spark}>
                              <Line type="monotone" dataKey="v" stroke={i % 2 === 0 ? "#2dd4bf" : "#f59e0b"} strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">{item.stock}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white">{item.price}</td>
                      <td className="px-4 py-3 rounded-r-xl">
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full text-white ${i % 2 === 0 ? "bg-orange-500" : "bg-indigo-500"}`}>
                          {item.store}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Showing 1 to 3 of 5 items</span>
              <div className="flex gap-1">
                <button className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button className="w-7 h-7 rounded bg-pink-600 text-white font-bold text-xs flex items-center justify-center shadow-md">1</button>
                <button className="w-7 h-7 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">2</button>
                <button className="w-7 h-7 rounded bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-8 pb-4 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          <span>Copyright © 2026 - Version 4.5.0</span>
          <span className="text-slate-500 dark:text-slate-400">Facit Theme</span>
        </div>

      </div>
    </div>
  );
}
