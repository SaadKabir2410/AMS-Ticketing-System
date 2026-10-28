import React, { useCallback, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useNavigate } from "react-router-dom";
import SettingsService from "../services/api/settings";
import { useToast } from "../component/common/ToastContext";
import SendTestEmailModal from "../component/common/SendTestEmailModal";
import {
  getCachedApplicationConfig,
  loadApplicationConfig,
} from "../services/applicationConfigCache";

const getLocalizationValue = (applicationConfig, key) => {
  const resources = applicationConfig?.localization?.values;
  if (!resources || typeof resources !== "object") return key;

  const defaultResourceName = applicationConfig?.localization?.defaultResourceName;
  const defaultValue = resources[defaultResourceName]?.[key];
  if (typeof defaultValue === "string" && defaultValue.trim()) {
    return defaultValue.trim();
  }

  for (const resource of Object.values(resources)) {
    const value = resource?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return key;
};

const InputField = ({ label, required, value, name, onChange, type = "text", placeholder }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const finalType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="mb-5 max-w-2xl">
      <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1.5 leading-none">
        {label} {required && <span className="required-asterisk">*</span>}
      </label>
      <div className="relative max-w-lg">
        <input
          type={finalType}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.stopPropagation();
            }
          }}
          className={`${type === "number" ? "max-w-[300px]" : "w-full"} h-10 px-4 ${isPassword ? "pr-10" : ""} bg-[#f8f9fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 font-medium placeholder:text-slate-400 placeholder:font-normal`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};


export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("emailing");
  const [loading, setLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailModalOpen, setTestEmailModalOpen] = useState(false);
  const [systemLoading, setSystemLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [applicationConfig, setApplicationConfig] = useState(getCachedApplicationConfig);
  const localize = useCallback(
    (key) => getLocalizationValue(applicationConfig, key),
    [applicationConfig],
  );

  React.useEffect(() => {
    let isCurrent = true;
    loadApplicationConfig().then((config) => {
      if (isCurrent) setApplicationConfig(config);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const [emailSettings, setEmailSettings] = useState({
    defaultFromDisplayName: "",
    defaultFromAddress: "",
    host: "",
    port: "",
    enableSsl: false,
    useDefaultCredentials: false,
    domain: "",
    username: "",
    password: "", // never populated from API
  });

  const [systemSettings, setSystemSettings] = useState({
    baseNumberOfTicketsForAfterOfficeHours: "",
    jobsheetCanBeModifiedUpToDays: "",
    workingHoursFrom: "",
    workingHoursTo: "",
    specificTicketsCommissionPercentage: "",
    serviceDemandTicketsMaximumClosedHours: "",
    dailyGoalMinutes: "",
    weeklyGoalMinutes: "",
    monthlyGoalMinutes: "",
  });

  // Fetch email settings on mount
  React.useEffect(() => {
    const fetchEmailSettings = async () => {
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
        showToast(localize("DefaultErrorMessage"), "error");
      } finally {
        setLoading(false);
      }
    };

    fetchEmailSettings();
  }, [localize, showToast]);

  // Fetch system settings when System Settings tab is opened
  React.useEffect(() => {
    if (activeTab !== "system") return;

    const fetchSystemSettings = async () => {
      setSystemLoading(true);
      try {
        const data = await SettingsService.getSystemSettings();
        setSystemSettings({
          baseNumberOfTicketsForAfterOfficeHours: data.baseNumberOfTicketsForAfterOfficeHours ?? "",
          jobsheetCanBeModifiedUpToDays: data.jobsheetCanBeModifiedUpToDays ?? "",
          workingHoursFrom: data.workingHoursFrom ?? "",
          workingHoursTo: data.workingHoursTo ?? "",
          specificTicketsCommissionPercentage: data.specificTicketsCommissionPercentage ?? "",
          serviceDemandTicketsMaximumClosedHours: data.serviceDemandTicketsMaximumClosedHours ?? "",
          dailyGoalMinutes: data.dailyGoalMinutes ?? "",
          weeklyGoalMinutes: data.weeklyGoalMinutes ?? "",
          monthlyGoalMinutes: data.monthlyGoalMinutes ?? "",
        });
      } catch (error) {
        console.error("Failed to fetch system settings:", error);
        showToast(localize("DefaultErrorMessage"), "error");
      } finally {
        setSystemLoading(false);
      }
    };

    fetchSystemSettings();
  }, [activeTab, localize, showToast]);

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
      showToast(localize("SavedSuccessfully"), "success");

    } catch (error) {
      console.error("Save Email Settings Error:", error);
      showToast(localize("DefaultErrorMessage"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async (testEmail) => {
    setTestEmailLoading(true);
    try {
      await SettingsService.sendTestEmail(testEmail);
      showToast(localize("SuccessfullySent"), "success");
      setTestEmailModalOpen(false);

    } catch (error) {
      console.error("Send Test Email Error:", error);
      showToast(localize("DefaultErrorMessage"), "error");
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    setSystemLoading(true);
    try {
      await SettingsService.updateSystemSettings(systemSettings);
      showToast(localize("SavedSuccessfully"), "success");

    } catch (error) {
      console.error("Save System Settings Error:", error);
      showToast(localize("DefaultErrorMessage"), "error");
    } finally {
      setSystemLoading(false);
    }
  };

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="app-page-header flex flex-col gap-2 py-8 px-4 md:px-8 border-b border-slate-100 dark:border-slate-800/50">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1">
            <span onClick={() => navigate("/")} className="hover:text-pink-500 cursor-pointer transition-colors">{localize("Home")}</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-pink-500">{localize("Settings")}</span>
          </nav>
          <div className="flex items-center gap-4">

            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{localize("Settings")}</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row p-6 lg:p-8 flex-1">

          {/* Sidebar */}
          <div className="w-full md:w-64 flex flex-col gap-1 pr-6 shrink-0 border-r border-slate-100 dark:border-slate-800/50 mb-8 md:mb-0">
            {[
              { id: "emailing", label: localize("Menu:Emailing") },
              { id: "system", label: localize("Permission:BillingPermissionsSettings.SystemSettings") },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-5 py-2.5 rounded-lg text-sm transition-all ${activeTab === tab.id
                  ? "bg-[#ffebf3] text-[#ec4899] font-semibold dark:bg-pink-500/10 dark:text-pink-400"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 md:pl-10">

            {/* Emailing Tab */}
            {activeTab === "emailing" && (
              <div className="animate-in fade-in duration-300">
                <InputField
                  label={localize("DefaultFromDisplayName")}
                  required
                  name="defaultFromDisplayName"
                  value={emailSettings.defaultFromDisplayName}
                  onChange={handleEmailChange}
                />
                <InputField
                  label={localize("DefaultFromAddress")}
                  required
                  name="defaultFromAddress"
                  value={emailSettings.defaultFromAddress}
                  onChange={handleEmailChange}
                />
                <InputField
                  label={localize("SmtpHost")}
                  name="host"
                  value={emailSettings.host}
                  onChange={handleEmailChange}
                />
                <InputField
                  label={localize("SmtpPort")}
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
                    {localize("SmtpEnableSsl")}
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
                    {localize("SmtpUseDefaultCredentials")}
                  </span>
                </div>

                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${!emailSettings.useDefaultCredentials ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0 pointer-events-none"}`}>
                  <div className="space-y-1">
                    <InputField
                      label={localize("SmtpDomain")}
                      name="domain"
                      value={emailSettings.domain}
                      onChange={handleEmailChange}
                    />
                    <InputField
                      label={localize("SmtpUserName")}
                      name="username"
                      value={emailSettings.username}
                      onChange={handleEmailChange}
                    />
                    <InputField
                      label={localize("SmtpPassword")}
                      type="password"
                      name="password"
                      value={emailSettings.password}
                      onChange={handleEmailChange}
                    />
                  </div>
                </div>


                <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 pb-2">
                  <button
                    onClick={() => setTestEmailModalOpen(true)}
                    disabled={testEmailLoading || loading}
                    className="app-primary-button inline-flex items-center justify-center px-5 py-2.5 text-xs"
                  >
                    {localize("SendTestEmail")}
                  </button>
                  <button
                    onClick={handleSaveEmailSettings}
                    disabled={loading}
                    className="app-primary-button inline-flex items-center justify-center px-5 py-2.5 text-xs"
                  >
                    {loading ? localize("SavingWithThreeDot") : localize("Save")}
                  </button>
                </div>
              </div>
            )}

            {/* System Settings Tab */}
            {activeTab === "system" && (
              <div className="animate-in fade-in duration-300">
                {systemLoading ? (
                  <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                    {localize("LoadingWithThreeDot")}
                  </div>
                ) : (
                  <>
                    <InputField
                      label={localize("BaseNumberOfTicketsForAfterOfficeHours")}
                      required
                      type="number"
                      name="baseNumberOfTicketsForAfterOfficeHours"
                      value={systemSettings.baseNumberOfTicketsForAfterOfficeHours}
                      onChange={handleSystemChange}
                    />
                    <InputField
                      label={localize("EditableJobsheetDays")}
                      required
                      type="number"
                      name="jobsheetCanBeModifiedUpToDays"
                      value={systemSettings.jobsheetCanBeModifiedUpToDays}
                      onChange={handleSystemChange}
                    />
                    <InputField
                      label={localize("WorkingHoursFrom")}
                      required
                      type="number"
                      name="workingHoursFrom"
                      value={systemSettings.workingHoursFrom}
                      onChange={handleSystemChange}
                    />
                    <InputField
                      label={localize("WorkingHoursTo")}
                      required
                      type="number"
                      name="workingHoursTo"
                      value={systemSettings.workingHoursTo}
                      onChange={handleSystemChange}
                    />
                    <InputField
                      label={localize("AMSTicketCommissionPercentage")}
                      required
                      type="number"
                      name="specificTicketsCommissionPercentage"
                      value={systemSettings.specificTicketsCommissionPercentage}
                      onChange={handleSystemChange}
                    />
                    <InputField
                      label={localize("ServiceDemandTicketsMaximumClosedHours")}
                      required
                      type="number"
                      name="serviceDemandTicketsMaximumClosedHours"
                      value={systemSettings.serviceDemandTicketsMaximumClosedHours}
                      onChange={handleSystemChange}
                    />
                    <InputField
                      label={localize("DailyGoalMinutes")}
                      required
                      type="number"
                      name="dailyGoalMinutes"
                      value={systemSettings.dailyGoalMinutes}
                      onChange={handleSystemChange}
                    />
                    <InputField
                      label={localize("WeeklyGoalMinutes")}
                      required
                      type="number"
                      name="weeklyGoalMinutes"
                      value={systemSettings.weeklyGoalMinutes}
                      onChange={handleSystemChange}
                    />
                    <InputField
                      label={localize("MonthlyGoalMinutes")}
                      required
                      type="number"
                      name="monthlyGoalMinutes"
                      value={systemSettings.monthlyGoalMinutes}
                      onChange={handleSystemChange}
                    />
                    <div className="pt-3">
                      <button
                        onClick={handleSaveSystemSettings}
                        disabled={systemLoading}
                        className="app-primary-button inline-flex items-center justify-center px-5 py-2.5 text-xs"
                      >
                        {systemLoading ? localize("SavingWithThreeDot") : localize("Save")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
      {testEmailModalOpen && (
        <SendTestEmailModal
          open
          onClose={() => setTestEmailModalOpen(false)}
          onSend={handleSendTestEmail}
          loading={testEmailLoading}
          defaultSender={emailSettings.defaultFromAddress}
          localize={localize}
        />
      )}
    </div>
  );
}


