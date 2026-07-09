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

      </div>
    </div>
  );
}
