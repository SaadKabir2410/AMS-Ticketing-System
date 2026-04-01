import { useState } from "react";
import { EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContextHook";

function PasswordField({ label }) {
  return (
    <div className="mb-6">
      <label className="block text-[13px] text-slate-500 font-medium mb-1.5 ml-0.5">
        {label}
      </label>
      <div className="flex">
        <input
          type="password"
          className="flex-1 px-4 py-2.5 text-[14px] bg-[#f8f9fa] dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-l text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
        />
        <button
          type="button"
          className="px-4 py-2.5 bg-[#6c5ce7] hover:bg-[#5f51cd] text-white rounded-r flex items-center justify-center transition-colors"
        >
          <EyeOff size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function InputField({ label, defaultValue = "", required = false }) {
  return (
    <div className="mb-6">
      <label className="block text-[13px] text-slate-500 font-medium mb-1.5 ml-0.5">
        {label} {required && <span>*</span>}
      </label>
      <input
        type="text"
        defaultValue={defaultValue}
        className="w-full px-4 py-2.5 text-[14px] font-medium bg-[#f8f9fa] dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-200"
      />
    </div>
  );
}

export default function MyAccountPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Change password");

  const tabs = ["Change password", "Personal info"];

  return (
    <div className="w-full h-full flex flex-col p-2 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      
      <div className="flex flex-col md:flex-row gap-6 lg:gap-14 bg-white dark:bg-slate-900 p-8 lg:p-10 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1">
        
        {/* Left Sidebar */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-5 py-3 rounded-lg text-[14px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#ffebf3] dark:bg-pink-500/10 text-[#ec4899]"
                    : "bg-[#f8f9fa] dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 w-full max-w-3xl">
          
          {activeTab === "Change password" && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-[28px] font-medium text-slate-600 dark:text-slate-300 mb-6">
                Change password
              </h1>
              
              <hr className="border-slate-100 dark:border-slate-800 mb-6" />
              
              <h2 className="text-[20px] font-medium text-slate-500 dark:text-slate-400 mb-8">
                Change password
              </h2>

              <div className="max-w-2xl">
                <PasswordField label="Current password" />
                <PasswordField label="New password" />
                <PasswordField label="Confirm new password" />

                <div className="pt-2">
                  <button className="px-6 py-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded font-semibold text-[14px] tracking-wide active:scale-95 transition-all outline-none">
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Personal info" && (
            <div className="animate-in fade-in duration-300">
              <h1 className="text-[28px] font-medium text-slate-600 dark:text-slate-300 mb-6">
                Personal info
              </h1>
              
              <hr className="border-slate-100 dark:border-slate-800 mb-6" />
              
              <h2 className="text-[20px] font-medium text-slate-500 dark:text-slate-400 mb-8">
                Personal settings
              </h2>

              <div className="max-w-2xl">
                <InputField label="Username" required />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <InputField label="Name" />
                  <InputField label="Surname" />
                </div>
                
                <InputField label="Email" required />
                <InputField label="Phone number" />

                <div className="pt-2">
                  <button className="px-6 py-2.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded font-semibold text-[14px] tracking-wide active:scale-95 transition-all outline-none">
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
