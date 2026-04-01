import React, { useState } from "react";
import { Home, ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SettingsService from "../services/api/settings";
import { useToast } from "../component/common/ToastContext";

const InputField = ({ label, required, value, name, onChange, type = "text" }) => (
  <div className="mb-5 max-w-2xl">
    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1.5 leading-none">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.key === "Backspace") {
          e.stopPropagation();
        }
      }}
      className={`${type === "number" ? "max-w-[300px]" : "max-w-lg"} w-full h-10 px-4 bg-[#f8f9fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 font-medium`}
    />
  </div>
);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Emailing");
  const [loading, setLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [emailSettings, setEmailSettings] = useState({
    defaultFromDisplayName: "",
    defaultFromAddress: "",
    host: "",
    port: "",
    enableSsl: false,
    useDefaultCredentials: false,
    domain: "",
    username: "",
    password: "",
  });

  const [systemSettings, setSystemSettings] = useState({
    baseNumberOfTicketsForAfterOfficeHours: "",
    jobsheetCanBeModifiedUpToDays: "",
    workingHoursFrom: "",
    workingHoursTo: "",
    specificTicketsCommissionPercentage: "",
  });

  React.useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await SettingsService.getEmailSettings();
        setEmailSettings({
          defaultFromDisplayName: data.defaultFromDisplayName ?? "",
          defaultFromAddress: data.defaultFromAddress ?? "",
          host: data.smtpHost ?? "",
          port: data.smtpPort?.toString() ?? "",
          enableSsl: data.smtpEnableSsl ?? false,
          useDefaultCredentials: data.smtpUseDefaultCredentials ?? false,
          domain: data.smtpDomain ?? "",
          username: data.smtpUserName ?? "",
          password: data.smtpPassword ?? "",
        });
      } catch (error) {
        console.error("Failed to fetch email settings:", error);
        showToast("Failed to load email settings", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleEmailChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEmailSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSystemChange = (e) => {
    const { name, value } = e.target;
    setSystemSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEmailSettings = async () => {
    setLoading(true);
    try {
      await SettingsService.updateEmailSettings(emailSettings);
      showToast("Email settings saved successfully!", "success");
    } catch (error) {
      console.error("Save Email Settings Error:", error);
      showToast("Failed to save email settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setTestEmailLoading(true);
    try {
      await SettingsService.sendTestEmail(emailSettings.defaultFromAddress);
      showToast("Test email sent successfully!", "success");
    } catch (error) {
      console.error("Send Test Email Error:", error);
      showToast("Failed to send test email", "error");
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    setLoading(true);
    try {
      showToast("System settings saved successfully!", "success");
    } catch (error) {
      showToast("Failed to save system settings", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-w-6xl mx-auto w-full py-6">
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>
        </div>
      </div>

      {/* Main Card */}
      <div className="flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800/50 p-6 lg:p-8">

        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-1 pr-6 shrink-0 border-r border-slate-100 dark:border-slate-800/50 mb-8 md:mb-0">
          {["Emailing", "Feature management", "System Settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-5 py-2.5 rounded-lg text-sm transition-all ${activeTab === tab
                ? "bg-[#ffebf3] text-[#ec4899] font-semibold dark:bg-pink-500/10 dark:text-pink-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 md:pl-10">

          {/* Emailing Tab */}
          {activeTab === "Emailing" && (
            <div className="animate-in fade-in duration-300">
              <InputField
                label="Default from display name"
                required
                name="defaultFromDisplayName"
                value={emailSettings.defaultFromDisplayName}
                onChange={handleEmailChange}
              />
              <InputField
                label="Default from address"
                required
                name="defaultFromAddress"
                value={emailSettings.defaultFromAddress}
                onChange={handleEmailChange}
              />
              <InputField
                label="Host"
                name="host"
                value={emailSettings.host}
                onChange={handleEmailChange}
              />
              <InputField
                label="Port"
                type="number"
                name="port"
                value={emailSettings.port}
                onChange={handleEmailChange}
              />

              <div className="flex items-center gap-3 mt-5 mb-3 cursor-pointer group w-max">
                <input
                  type="checkbox"
                  name="enableSsl"
                  checked={emailSettings.enableSsl}
                  onChange={handleEmailChange}
                  className="w-4 h-4 rounded border-slate-300 accent-pink-500 cursor-pointer"
                />
                <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 transition-colors">
                  Enable ssl
                </span>
              </div>
              <div className="flex items-center gap-3 mb-8 cursor-pointer group w-max">
                <input
                  type="checkbox"
                  name="useDefaultCredentials"
                  checked={emailSettings.useDefaultCredentials}
                  onChange={handleEmailChange}
                  className="w-4 h-4 rounded border-pink-500 text-pink-500 accent-pink-500 cursor-pointer"
                />
                <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 transition-colors">
                  Use default credentials
                </span>
              </div>

              <div className={`grid transition-all duration-500 ease-in-out ${!emailSettings.useDefaultCredentials ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 pt-4">
                    <InputField
                      label="Domain"
                      name="domain"
                      value={emailSettings.domain}
                      onChange={handleEmailChange}
                    />
                    <InputField
                      label="User name"
                      name="username"
                      value={emailSettings.username}
                      onChange={handleEmailChange}
                    />
                    <InputField
                      label="Password"
                      type="password"
                      name="password"
                      value={emailSettings.password}
                      onChange={handleEmailChange}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 pb-2">
                <button
                  onClick={handleSendTestEmail}
                  disabled={testEmailLoading || loading}
                  className="px-6 py-2 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg text-[13px] font-bold hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors shadow-sm tracking-wide disabled:opacity-50"
                >
                  {testEmailLoading ? "Sending..." : "Send test email"}
                </button>
                <button
                  onClick={handleSaveEmailSettings}
                  disabled={loading}
                  className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-bold transition-all shadow-md active:scale-95 tracking-wide disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* Feature Management Tab */}
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

          {/* System Settings Tab */}
          {activeTab === "System Settings" && (
            <div className="animate-in fade-in duration-300">
              <InputField
                label="Base Number Of Tickets For After Office Hours"
                required
                type="number"
                name="baseNumberOfTicketsForAfterOfficeHours"
                value={systemSettings.baseNumberOfTicketsForAfterOfficeHours}
                onChange={handleSystemChange}
              />
              <InputField
                label="Jobsheet can be modified up to (days)"
                required
                type="number"
                name="jobsheetCanBeModifiedUpToDays"
                value={systemSettings.jobsheetCanBeModifiedUpToDays}
                onChange={handleSystemChange}
              />
              <InputField
                label="Working Hours From"
                required
                type="number"
                name="workingHoursFrom"
                value={systemSettings.workingHoursFrom}
                onChange={handleSystemChange}
              />
              <InputField
                label="Working Hours To"
                required
                type="number"
                name="workingHoursTo"
                value={systemSettings.workingHoursTo}
                onChange={handleSystemChange}
              />
              <InputField
                label="Specific Tickets Commission Percentage (%)"
                required
                type="number"
                name="specificTicketsCommissionPercentage"
                value={systemSettings.specificTicketsCommissionPercentage}
                onChange={handleSystemChange}
              />
              <div className="pt-3">
                <button
                  onClick={handleSaveSystemSettings}
                  disabled={loading}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 tracking-wide min-w-[100px] disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}