import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, ComposedChart, Legend,
} from "recharts";
import {
  Mail, Phone, MessageSquare, ChevronRight, CheckCircle2,
  MoreHorizontal, Plus, Download, CreditCard, PieChart,
  Tag, Activity, CheckSquare, Briefcase, CreditCard as CardIcon, ChevronLeft, Ticket
} from "lucide-react";
import dashboardApi from "../services/api/dashboardApi";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContextHook";

// --- Utility Components ---

const AvatarStack = ({ count = 3, max = 3 }) => {
  return (
    <div className="flex items-center -space-x-2">
      {Array.from({ length: Math.min(count, max) }).map((_, i) => (
        <img
          key={i}
          className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
          src={`https://i.pravatar.cc/150?u=team${i}`}
          alt="Avatar"
        />
      ))}
      {count > max && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shadow-sm">
          +{count - max}
        </div>
      )}
    </div>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 ${className}`}>
    {children}
  </div>
);

// --- Main Dashboard Component ---

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
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6fa]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-[#f4f6fa] p-4 md:p-8 font-sans text-slate-800">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* --- Top Header / Overview --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Overview</h1>
          </div>
        </div>

        {/* --- Banner --- */}
        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#eef0fc] border border-[#e0e4f7] rounded-2xl p-4 flex items-start justify-between relative shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mt-1">
                  <CheckCircle2 size={18} fill="currentColor" className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-indigo-950 flex items-center gap-2">
                    {getGreeting()}, {user?.name || user?.userName || "User"}!
                  </h3>
                  <p className="text-sm font-medium text-slate-600 mt-0.5">
                    Here's what's happening with your projects today.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <MoreHorizontal size={20} className="rotate-45" /> {/* Close X approx */}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Middle Row: Activities, Tasks, Waiting Answer --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Recent Activities */}
          <Card className="lg:col-span-4 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                <Briefcase size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Recent Activities</h3>
                <p className="text-xs text-slate-400 font-medium">last 2 weeks</p>
              </div>
            </div>
            <div className="flex-1 relative pl-3">
              {/* Timeline vertical line */}
              <div className="absolute left-[27px] top-2 bottom-2 w-px bg-slate-200"></div>

              <div className="space-y-6">
                {data.recentActivities.map((act, i) => (
                  <div key={act.id} className="relative flex items-start gap-4">
                    <div className="w-12 pt-0.5 text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-900">{act.time}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full border-2 bg-white mt-1 relative z-10 
                        ${act.type === 'success' ? 'border-teal-400' : act.type === 'warning' ? 'border-orange-400' : 'border-indigo-400'}`}
                    />
                    <div className="text-xs font-medium text-slate-600 leading-relaxed pr-2">
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
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">John's Issue</h3>
                  <div className="h-1.5 w-16 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-indigo-500 w-1/3 rounded-full"></div>
                  </div>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100">
                <Plus size={14} />
                New
              </button>
            </div>

            <div className="flex-1 space-y-4">
              {data.johnsIssue.map((issue) => (
                <div key={issue.id} className="flex items-start gap-3 group">
                  <div className="mt-0.5">
                    <input type="checkbox" defaultChecked={issue.checked} className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-bold transition-all ${issue.checked ? "text-slate-400 line-through" : "text-slate-700"}`}>
                      {issue.text}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1">in {issue.days}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded flex items-center
                        ${issue.type === 'New' ? 'text-teal-500 bg-teal-50' :
                        issue.type === 'Update' ? 'text-indigo-500 bg-indigo-50' :
                          issue.type === 'Test' ? 'text-orange-500 bg-orange-50' :
                            'text-indigo-400 bg-indigo-50'}`}>
                      {issue.type}
                    </span>
                    <button className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-50 text-slate-400 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Waiting for an Answer</h3>
                <p className="text-xs text-slate-400 font-medium">Customer</p>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreHorizontal size={20} />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-4">
            {data.waitingForAnswer.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-slate-100 object-cover bg-slate-50" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{user.name}</h4>
                    <p className="text-[10px] font-medium text-slate-400 truncate w-24">{user.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-700">%{user.progress}</span>
                    {/* Circular Progress Mock */}
                    <svg className="w-6 h-6 transform -rotate-90">
                      <circle cx="12" cy="12" r="10" stroke="#f1f5f9" strokeWidth="3" fill="none" />
                      <circle cx="12" cy="12" r="10" stroke={user.progress > 40 ? "#f59e0b" : user.progress > 20 ? "#f43f5e" : "#2dd4bf"} strokeWidth="3" fill="none" strokeDasharray="62.8" strokeDashoffset={62.8 - (62.8 * user.progress) / 100} strokeLinecap="round" />
                    </svg>
                  </div>
                  <button className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                    <Mail size={12} className="text-indigo-400" />
                    Send
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* --- Bottom Row: Wallet, Top Seller --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* My Wallet */}
        <Card className="lg:col-span-4 flex flex-col h-full bg-[#fafbfc]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <CardIcon size={20} />
              </div>
              <h3 className="font-bold text-slate-900">My Wallet</h3>
            </div>
            <button className="px-3 py-1.5 bg-white border border-indigo-100 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-50 shadow-sm transition-all">
              <CreditCard size={14} className="text-indigo-400" />
              Add New
            </button>
          </div>

          <div className="flex flex-col items-center">
            {/* Mastercard UI */}
            <div className="w-full max-w-[280px] h-[160px] bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-5 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.5)] relative overflow-hidden text-white flex flex-col justify-between mb-6 transform hover:scale-105 transition-transform duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-center relative z-10">
                <div className="w-10 h-7 bg-white/20 rounded flex items-center justify-center">
                  <div className="w-5 h-4 border border-white/50 rounded-sm bg-white/10"></div>
                </div>
                {/* Mastercard Logo Mock */}
                <div className="flex relative w-10 h-6">
                  <div className="w-6 h-6 rounded-full bg-red-500/80 absolute right-4 mix-blend-multiply"></div>
                  <div className="w-6 h-6 rounded-full bg-yellow-400/80 absolute right-0 mix-blend-multiply"></div>
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

            {/* Card List */}
            <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-xs font-bold text-slate-700">
              <div className="flex justify-between items-center p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <span>Visa - 1134</span>
                <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px]">Mastercard - 1198</div>
              </div>
              <div className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                <span>Amex - 00002</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Top Seller Table */}
        <Card className="lg:col-span-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-500">
                <Briefcase size={20} />
              </div>
              <h3 className="font-bold text-slate-900">Top Seller</h3>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-teal-50 text-teal-600 rounded-lg text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>
                Jun 3
                <ChevronRight size={14} className="rotate-90 ml-1 opacity-50" />
              </button>
              <button className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                <Download size={14} className="text-indigo-400" />
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-4 pb-2 text-[10px] font-black uppercase text-slate-900">#</th>
                  <th className="px-4 pb-2 text-[10px] font-black uppercase text-slate-900">Image</th>
                  <th className="px-4 pb-2 text-[10px] font-black uppercase text-slate-900">Name</th>
                  <th className="px-4 pb-2 text-[10px] font-black uppercase text-slate-900 text-center">Sales</th>
                  <th className="px-4 pb-2 text-[10px] font-black uppercase text-slate-900">Stock</th>
                  <th className="px-4 pb-2 text-[10px] font-black uppercase text-slate-900">Price</th>
                  <th className="px-4 pb-2 text-[10px] font-black uppercase text-slate-900">Store</th>
                </tr>
              </thead>
              <tbody>
                {data.topSeller.map((item, i) => (
                  <tr key={i} className="bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 rounded-l-xl text-xs font-black text-slate-900">{item.id + 1}</td>
                    <td className="px-4 py-3">
                      <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover shadow-sm bg-white" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{item.category}</p>
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
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">{item.stock}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-900">{item.price}</td>
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

          {/* Pagination Mock */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400 font-medium">Showing 1 to 3 of 5 items</span>
            <div className="flex gap-1">
              <button className="w-7 h-7 rounded bg-slate-100 text-slate-400 flex items-center justify-center"><ChevronLeft size={14} /></button>
              <button className="w-7 h-7 rounded bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">1</button>
              <button className="w-7 h-7 rounded bg-slate-50 text-slate-600 font-bold text-xs hover:bg-slate-100 flex items-center justify-center">2</button>
              <button className="w-7 h-7 rounded bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100"><ChevronRight size={14} /></button>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-8 pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>Copyright © 2026 - Version 4.5.0</span>
        <span className="text-slate-900">Facit Theme</span>
      </div>

    </div>
    </div>
  );
}
