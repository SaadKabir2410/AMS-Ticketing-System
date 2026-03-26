import React, { useState } from "react";
import { Home, ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Emailing");
  const navigate = useNavigate();

  const InputField = ({ label, required, value, type = "text" }) => (
    <div className="mb-5 max-w-2xl">
      <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        defaultValue={value}
        className="w-full h-10 px-4 bg-[#f8f9fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full">
      {/* Breadcrumb & Title */}
      <div className="mb-6">
        <div className="flex items-center text-[12px] text-slate-500 dark:text-slate-400 gap-2 mb-3">
          <Home size={14} className="text-slate-500" /> / <span>Settings</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-700 dark:text-slate-200"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Settings
          </h1>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800/50 min-h-[500px] p-6 lg:p-8">
        
        {/* Left Sidebar Menu */}
        <div className="w-full md:w-64 flex flex-col gap-1 pr-6 shrink-0 border-r border-slate-100 dark:border-slate-800/50 mb-8 md:mb-0">
          <button
            onClick={() => setActiveTab("Emailing")}
            className={`w-full text-left px-5 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === "Emailing"
                ? "bg-[#ffebf3] text-[#ec4899] font-semibold dark:bg-pink-500/10 dark:text-pink-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            }`}
          >
            Emailing
          </button>
          <button
            onClick={() => setActiveTab("Feature management")}
            className={`w-full text-left px-5 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === "Feature management"
                ? "bg-[#ffebf3] text-[#ec4899] font-semibold dark:bg-pink-500/10 dark:text-pink-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            }`}
          >
            Feature management
          </button>
          <button
            onClick={() => setActiveTab("System Settings")}
            className={`w-full text-left px-5 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === "System Settings"
                ? "bg-[#ffebf3] text-[#ec4899] font-semibold dark:bg-pink-500/10 dark:text-pink-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            }`}
          >
            System Settings
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 md:pl-10">
          {activeTab === "Emailing" && (
            <div className="animate-in fade-in duration-300">
              <InputField label="Default from display name" required />
              <InputField label="Default from address" required />
              <InputField label="Host" />
              <InputField label="Port" type="number" />
              
              <div className="flex items-center gap-3 mt-5 mb-3 cursor-pointer group w-max">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-pink-500 cursor-pointer" />
                <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 transition-colors">Enable ssl</span>
              </div>
              <div className="flex items-center gap-3 mb-8 cursor-pointer group w-max">
                <input type="checkbox" className="w-4 h-4 rounded border-pink-500 text-pink-500 accent-pink-500 cursor-pointer" />
                <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 transition-colors">Use default credentials</span>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 pb-2">
                <button className="px-6 py-2 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg text-[13px] font-bold hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors shadow-sm tracking-wide">
                  Send test email
                </button>
                <button className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-bold transition-all shadow-md active:scale-95 tracking-wide">
                  Save
                </button>
              </div>
            </div>
          )}

          {activeTab === "Feature management" && (
            <div className="animate-in fade-in duration-300 pt-2">
              <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-6">
                You can manage the host side features by clicking the following button.
              </p>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95">
                <SettingsIcon size={16} strokeWidth={2.5} /> 
                Manage host features
              </button>
            </div>
          )}

          {activeTab === "System Settings" && (
            <div className="animate-in fade-in duration-300">
              <InputField label="Base Number Of Tickets For After Office Hours" required type="number" />
              <InputField label="Jobsheet can be modified up to (days)" required type="number" />
              <InputField label="Working Hours From" required type="number" />
              <InputField label="Working Hours To" required type="number" />
              <InputField label="Specific Tickets Commission Percentage (%)" required type="number" />

              <div className="pt-3">
                <button className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 tracking-wide min-w-[100px]">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
