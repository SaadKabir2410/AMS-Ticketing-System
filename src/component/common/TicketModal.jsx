import { useState, useEffect } from "react";
import {
  AlertCircle,
  X,
  Plus,
  ChevronLeft,
  Calendar,
  FileText,
  Activity,
  ShieldCheck,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumErrorAlert from "./PremiumErrorAlert";
import SiteModal from "./SiteModal";
import ActivityModal from "./ActivityModal";
import { useToast } from "./ToastContext";
import { useAuth } from "../../context/AuthContextHook";

import { usersApi } from "../../services/api/users";
import { sitesApi } from "../../services/api/sites";
import { amsTicketApi } from "../../services/api/amsTicketApi";
import codeDetailsApi from "../../services/api/CodeDetails";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5 flex flex-col group/field">
      {label && (
        <label className="text-[10px] uppercase font-bold tracking-widest text-black dark:text-slate-400 mb-0.5 group-focus-within/field:text-pink-600 transition-colors flex items-center gap-2">
          {label.includes("*") ? (
            <>
              {label.split("*")[0]}
              <span className="text-rose-500">*</span>
            </>
          ) : (
            label
          )}
        </label>
      )}
      <div className="relative">{children}</div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-bold text-rose-600 flex items-center gap-1.5 mt-1.5 uppercase tracking-widest"
        >
          <AlertCircle size={10} strokeWidth={2.5} /> {error}
        </motion.p>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none transition-all focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 shadow-sm font-medium text-black dark:text-slate-200 placeholder:text-slate-400/60";

function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = (options || []).filter((opt) =>
    String(opt).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`${inputClass} flex items-center justify-between cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30" : ""} ${error ? "border-rose-500" : ""}`}
      >
        <span
          className={`truncate ${!value ? "text-slate-400" : "text-black dark:text-white"}`}
        >
          {value || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""} text-slate-400 shrink-0 ml-2`}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-[100] mt-2 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[300px]"
          >
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-4 focus:ring-pink-500/10 transition-all"
                />
              </div>
            </div>

            <div className="overflow-y-auto no-scrollbar flex-1">
              {loading ? (
                <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Loading...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  No results found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        onChange(opt);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                        value === opt
                          ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {value === opt && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EMPTY = {
  pdfFile: null,
  receivedAt: "",
  cmsNextTicketNo: "",
  siteName: "",
  customer: "",
  ticketAssignedTo: "",
  ticketType: "",
  ticketIncomingChannel: "",
  isTicketForwarded: false,
  ticketForwardedBy: "",
  cmsTicketAddedBy: "",
  cmsTicketAddedOn: "",
  issueDescription: "",
  possibleRootCause: "",
  notes: "",
  totalDuration: "",
  pre: false,
  ticketResolutionVerifiedBy: "",
  ticketResolutionVerifiedOn: "",
  cmsTicketClosedBy: "",
  cmsTicketClosedOn: "",
  serviceClosedDate: "",
};

export default function TicketModal({
  open,
  onClose,
  onSave,
  onSubmit: onSubmitProp,
  ticket = null,
  submitting = false,
}) {
  const onSubmit = onSave || onSubmitProp;
  const isEdit = !!ticket;
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes("admin");

  const [activeTab, setActiveTab] = useState("Ticket");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const [loadingApis, setLoadingApis] = useState(false);
  const [apiData, setApiData] = useState({
    siteNames: [],
    customers: [],
    assignees: [],
    itsUsers: [],
    ticketTypes: [],
    incomingChannels: [],
  });
  const [rawSites, setRawSites] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  // Placeholder for customer modal if it existed
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDateWarning, setShowDateWarning] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({ ...EMPTY });
      setErrors({});
      setActiveTab("Ticket");
      setShowExitConfirm(false);
      setShowDateWarning(false);
      return;
    }

    setShowExitConfirm(false);
    setShowDateWarning(false);
    setErrors({});
    setActiveTab("Ticket");
    if (ticket) {
      setForm({
        ...EMPTY,
        ...ticket,
        receivedAt: ticket.receivedAt ? ticket.receivedAt.slice(0, 16) : "",
        cmsTicketAddedOn: ticket.cmsTicketAddedOn
          ? ticket.cmsTicketAddedOn.slice(0, 16)
          : "",
        isTicketForwarded: !!ticket.ticketForwardedBy,
      });

      // Hydrate thoroughly from backend to guarantee perfectly fresh un-cached records
      amsTicketApi
        .getById(ticket.id)
        .then((fullData) => {
          setForm((prev) => ({
            ...prev,
            ...fullData,
            receivedAt: fullData.receivedAt
              ? fullData.receivedAt.slice(0, 16)
              : prev.receivedAt,
            cmsTicketAddedOn: fullData.cmsTicketAddedOn
              ? fullData.cmsTicketAddedOn.slice(0, 16)
              : prev.cmsTicketAddedOn,
            isTicketForwarded: !!fullData.ticketForwardedBy,
          }));
        })
        .catch((err) =>
          console.error("Failed to fetch secure ticket record:", err),
        );
    } else {
      setForm({
        ...EMPTY,
      });
    }

    setLoadingApis(true);
    Promise.all([
      sitesApi.getAll({ perPage: 1000 }).catch(() => ({ items: [] })),
      usersApi.getUsersList().catch(() => []),
      usersApi
        .getUsersList({
          organizationTypes: [2, 3],
          isITS: true,
          onlyLoadCurrentUser: false,
          mustCompleteJobsheet: undefined,
        })
        .catch(() => []),
      // Fetch dynamic lookup codes
      codeDetailsApi.getListByLookupCodes({ 
        lookupCodes: ["TicketType", "TicketIncomingChannel"] 
      }).catch(() => ({}))
    ])
      .then(([sitesRes, usersRes, itsUsersRes, lookupsRes]) => {
        const fetchedSites = sitesRes?.items || [];
        setRawSites(fetchedSites);

        // Map lookup details to simple string arrays
        const ticketTypes = (lookupsRes["TicketType"] || [])
          .map(item => item.description || item.newCode)
          .sort((a, b) => a.localeCompare(b));

        const incomingChannels = (lookupsRes["TicketIncomingChannel"] || [])
          .map(item => item.description || item.newCode)
          .sort((a, b) => a.localeCompare(b));

        setApiData((prev) => ({
          ...prev,
          siteNames: fetchedSites
            .map((s) => s.name || s.Name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)),
          assignees: (usersRes || [])
            .map((u) => u.name || u.userName)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)),
          itsUsers: (itsUsersRes || [])
            .map((u) => u.name || u.userName)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)),
          ticketTypes: ticketTypes.length > 0 
            ? ticketTypes 
            : ["Hardware", "Software", "Network", "General Inquiry"].sort((a, b) => a.localeCompare(b)),
          incomingChannels: incomingChannels.length > 0
            ? incomingChannels
            : ["Direct", "Email", "Phone", "Portal"].sort((a, b) => a.localeCompare(b)),
        }));
      })
      .finally(() => {
        setLoadingApis(false);
      });
  }, [open, ticket]);

  // Fetch customers when siteName changes
  useEffect(() => {
    if (!form.siteName) {
      setApiData((prev) => ({ ...prev, customers: [] }));
      return;
    }

    const selectedSite = rawSites.find(
      (s) => s.name === form.siteName || s.Name === form.siteName,
    );

    if (selectedSite && selectedSite.id) {
      setLoadingCustomers(true);
      usersApi
        .getCustomerUsers(selectedSite.id)
        .then((res) => {
          const customers = (res?.items || res || [])
            .map((c) => c.name || c.userName)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
          setApiData((prev) => ({ ...prev, customers }));
        })
        .catch(() => {
          setApiData((prev) => ({ ...prev, customers: [] }));
        })
        .finally(() => {
          setLoadingCustomers(false);
        });
    }
  }, [form.siteName, rawSites]);

  const setField = (key) => (e) => {
    let val = e?.target ? e.target.value : e;
    if (e?.target?.type === "checkbox") {
      val = e.target.checked;
    } else if (e?.target?.type === "file") {
      val = e.target.files[0];
    }
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: "" }));
  };

  const handleToggleForwarded = (e) => {
    const isChecked = e.target.checked;
    setForm((f) => ({
      ...f,
      isTicketForwarded: isChecked,
      ticketForwardedBy: isChecked ? f.ticketForwardedBy : "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      totalDuration: parseFloat(form.totalDuration) || 0,
    });
  };

  if (!open) return null;

  const tabIcons = {
    Ticket: null,
    Activities: null,
    "Ticket Verification": null,
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60"
            />

            {/* Modal Container */}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-6xl bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-auto max-h-[95vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex flex-col gap-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div>
                      <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                        <span>AMS</span>
                        <span className="text-slate-300 dark:text-slate-700">
                          /
                        </span>
                        <span className="text-pink-600">Tickets</span>
                      </nav>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {isEdit ? "Update Ticket" : "New AMS Ticket"}
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowExitConfirm(true)}
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-slate-700"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>

                <div className="flex px-8 gap-10">
                  {["Ticket", "Activities", "Ticket Verification"].map(
                    (tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2 group ${
                          activeTab === tab
                            ? "text-pink-600"
                            : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                        }`}
                      >
                        {tab}
                        {activeTab === tab && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-1 bg-pink-600 rounded-t-full shadow-[0_-4px_12px_rgba(236,72,153,0.2)]"
                          />
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Form Content */}
              <div className="overflow-y-auto no-scrollbar px-8 py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-5xl mx-auto"
                  >
                    {errors.server && (
                      <PremiumErrorAlert
                        open={!!errors.server}
                        message={errors.server}
                        onClose={() =>
                          setErrors((prev) => ({ ...prev, server: null }))
                        }
                      />
                    )}

                    {activeTab === "Ticket" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* 1. Upload PDF */}
                        <div className="md:col-span-2">
                          <Field label="Upload PDF" error={errors.pdfFile}>
                            <div className="relative group/file">
                              <input
                                type="file"
                                accept=".pdf"
                                onChange={setField("pdfFile")}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className="w-full p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-2 transition-all group-hover/file:border-pink-500/50 group-hover/file:bg-pink-500/[0.02]">
                                <div className="text-center">
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {form.pdfFile
                                      ? form.pdfFile.name
                                      : "Select PDF Document"}
                                  </p>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                    {form.pdfFile
                                      ? `${(form.pdfFile.size / 1024 / 1024).toFixed(2)} MB`
                                      : "PDF format only (Max 10MB)"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Field>
                        </div>

                        {/* 2. Ticket Received Date Time */}
                        <Field
                          label="Ticket Received Date Time *"
                          error={errors.receivedAt}
                        >
                          <div className="relative group/input">
                            <Flatpickr
                              data-enable-time
                              value={form.receivedAt}
                              onChange={(date, dateStr) => {
                                setForm((f) => ({ ...f, receivedAt: dateStr }));
                                if (errors.receivedAt)
                                  setErrors((e) => ({ ...e, receivedAt: "" }));
                              }}
                              options={{
                                enableTime: true,
                                dateFormat: "Y-m-d\\TH:i",
                                time_24hr: true,
                              }}
                              className={`${inputClass} ${errors.receivedAt ? "border-rose-500 text-rose-600" : ""}`}
                              placeholder="YYYY-MM-DD HH:MM"
                            />
                          </div>
                        </Field>

                        {/* 3. CMS Next Ticket No */}
                        <Field
                          label="CMS Next Ticket No *"
                          error={errors.cmsNextTicketNo}
                        >
                          <input
                            type="text"
                            value={form.cmsNextTicketNo}
                            onChange={setField("cmsNextTicketNo")}
                            className={inputClass}
                          />
                        </Field>

                        {/* 4. Site Name */}
                        <div className="md:col-span-2">
                          <Field label="Site Name *" error={errors.siteName}>
                            <div className="flex items-center gap-3">
                              <Combobox
                                value={form.siteName}
                                onChange={setField("siteName")}
                                options={apiData.siteNames}
                                placeholder={
                                  loadingApis
                                    ? "Loading Sites..."
                                    : "Search sites..."
                                }
                                disabled={loadingApis}
                                error={errors.siteName}
                              />
                              {!isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setIsSiteModalOpen(true)}
                                  className="px-4 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-pink-600 rounded-xl hover:border-pink-500 transition-all shadow-sm text-[10px] font-bold uppercase tracking-widest"
                                >
                                  New Site
                                </button>
                              )}
                            </div>
                          </Field>
                        </div>

                        {/* 5. Customer */}
                        <div className="md:col-span-2">
                          <Field label="Customer *" error={errors.customer}>
                            <div className="flex items-center gap-3">
                              <Combobox
                                value={form.customer}
                                onChange={setField("customer")}
                                options={apiData.customers}
                                placeholder={
                                  !form.siteName
                                    ? "Select Site Name first..."
                                    : loadingCustomers
                                      ? "Loading Customers..."
                                      : "Search customers..."
                                }
                                disabled={
                                  loadingApis ||
                                  loadingCustomers ||
                                  !form.siteName
                                }
                                error={errors.customer}
                              />
                              {!isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setIsCustomerModalOpen(true)}
                                  className="px-4 h-10 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-pink-600 rounded-xl hover:border-pink-500 transition-all shadow-sm text-[10px] font-bold uppercase tracking-widest"
                                >
                                  New Customer
                                </button>
                              )}
                            </div>
                          </Field>
                        </div>

                        {/* 6. Ticket Assigned To */}
                        <Field
                          label="Ticket Assigned To *"
                          error={errors.ticketAssignedTo}
                        >
                          <Combobox
                            value={form.ticketAssignedTo}
                            onChange={setField("ticketAssignedTo")}
                            options={apiData.assignees}
                            placeholder={
                              loadingApis
                                ? "Loading Assignees..."
                                : "Search users..."
                            }
                            disabled={loadingApis}
                            error={errors.ticketAssignedTo}
                          />
                        </Field>

                        {/* 7. Ticket Type */}
                        <Field label="Ticket Type *" error={errors.ticketType}>
                          <Combobox
                            value={form.ticketType}
                            onChange={setField("ticketType")}
                            options={apiData.ticketTypes}
                            placeholder={
                              loadingApis ? "Loading Types..." : "Select An Option"
                            }
                            disabled={loadingApis}
                            error={errors.ticketType}
                          />
                        </Field>

                        {/* 8 & 9. Ticket Incoming Channel AND Forward Toggle */}
                        <div className="flex gap-6 items-end">
                          <div className="flex-1">
                            <Field
                              label="Ticket Incoming Channel *"
                              error={errors.ticketIncomingChannel}
                            >
                              <Combobox
                                value={form.ticketIncomingChannel}
                                onChange={setField("ticketIncomingChannel")}
                                options={apiData.incomingChannels}
                                placeholder="Select An Option"
                                error={errors.ticketIncomingChannel}
                              />
                            </Field>
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer w-max mb-2 p-1 px-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                            <div className="relative group/toggle">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={form.isTicketForwarded}
                                onChange={handleToggleForwarded}
                              />
                              <div
                                className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.isTicketForwarded ? "bg-pink-600 shadow-lg shadow-pink-500/20" : "bg-slate-300 dark:bg-slate-700"}`}
                              ></div>
                              <motion.div
                                animate={{ x: form.isTicketForwarded ? 18 : 2 }}
                                className={`absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md transition-all`}
                              />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              Forwarded
                            </span>
                          </label>
                        </div>

                        {/* Ticket Forwarded By (Input) */}
                        <Field
                          label="Ticket Forwarded By"
                          error={errors.ticketForwardedBy}
                        >
                          <Combobox
                            value={form.ticketForwardedBy}
                            onChange={setField("ticketForwardedBy")}
                            options={apiData.assignees}
                            placeholder="Search users..."
                            disabled={!form.isTicketForwarded}
                            error={errors.ticketForwardedBy}
                          />
                        </Field>

                        {/* 10. CMS Ticket Added By */}
                        <Field
                          label="CMS Ticket Added By"
                          error={errors.cmsTicketAddedBy}
                        >
                          <Combobox
                            value={form.cmsTicketAddedBy}
                            onChange={setField("cmsTicketAddedBy")}
                            options={apiData.assignees}
                            placeholder="Search users..."
                            error={errors.cmsTicketAddedBy}
                          />
                        </Field>

                        {/* 11. CMS Ticket Added On */}
                        <Field
                          label="CMS Ticket Added On *"
                          error={errors.cmsTicketAddedOn}
                        >
                          <Flatpickr
                            data-enable-time
                            value={form.cmsTicketAddedOn}
                            onChange={(date, dateStr) => {
                              setForm((f) => ({
                                ...f,
                                cmsTicketAddedOn: dateStr,
                              }));
                              if (errors.cmsTicketAddedOn)
                                setErrors((e) => ({
                                  ...e,
                                  cmsTicketAddedOn: "",
                                }));
                            }}
                            options={{
                              enableTime: true,
                              dateFormat: "Y-m-d\\TH:i",
                              time_24hr: true,
                            }}
                            className={inputClass}
                            placeholder="YYYY-MM-DD"
                          />
                        </Field>

                        {/* 12. Issue Description */}
                        <div className="md:col-span-1">
                          <Field
                            label="Issue Description *"
                            error={errors.issueDescription}
                          >
                            <textarea
                              value={form.issueDescription}
                              onChange={setField("issueDescription")}
                              rows={3}
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        {/* 13. Possible Root Cause */}
                        <div className="md:col-span-1">
                          <Field
                            label="Possible Root Cause"
                            error={errors.possibleRootCause}
                          >
                            <textarea
                              value={form.possibleRootCause}
                              onChange={setField("possibleRootCause")}
                              rows={3}
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        {/* 14. Notes */}
                        <div className="md:col-span-2">
                          <Field label="Notes *" error={errors.notes}>
                            <textarea
                              value={form.notes}
                              onChange={setField("notes")}
                              rows={2}
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        {/* 15. Total Duration */}
                        <div className="md:col-span-2">
                          <Field
                            label="Total Duration (Hours)"
                            error={errors.totalDuration}
                          >
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={form.totalDuration}
                              onChange={setField("totalDuration")}
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        {/* 16. PRE Toggle */}
                        <div className="md:col-span-2">
                          <label className="flex items-center gap-3 cursor-pointer w-max p-1 px-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                            <div className="relative group/toggle">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={form.pre}
                                onChange={setField("pre")}
                              />
                              <div
                                className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.pre ? "bg-pink-600 shadow-lg shadow-pink-500/20" : "bg-slate-300 dark:bg-slate-700"}`}
                              ></div>
                              <motion.div
                                animate={{ x: form.pre ? 18 : 2 }}
                                className={`absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md transition-all`}
                              />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              PRE (Public Record Entry)
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {activeTab === "Activities" && (
                      <div className="flex flex-col h-full space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                              Ticket Activities
                            </h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                              Manage chronological service records
                            </p>
                          </div>
                          {!isAdmin && (
                            <button
                              type="button"
                              className="px-6 py-2.5 bg-pink-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-pink-700 transition shadow-lg shadow-pink-500/20"
                              onClick={() => {
                                if (!form.receivedAt) {
                                  setShowDateWarning(true);
                                  return;
                                }
                                setActivityToEdit(null);
                                setIsActivityModalOpen(true);
                              }}
                            >
                              Add Activity
                            </button>
                          )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex-1">
                          <div className="overflow-x-auto no-scrollbar h-full">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Actions
                                  </th>
                                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Activity Type
                                  </th>
                                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Start Date
                                  </th>
                                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    End Date
                                  </th>
                                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                                    Duration
                                  </th>
                                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Work Done Code
                                  </th>
                                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Likely Cause
                                  </th>
                                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Resolved By
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {!form.activities ||
                                form.activities.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan="8"
                                      className="px-6 py-12 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400"
                                    >
                                      No activities recorded
                                    </td>
                                  </tr>
                                ) : (
                                  form.activities.map((act, idx) => (
                                    <tr
                                      key={idx}
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                          <button
                                            type="button"
                                            className="text-[10px] font-bold uppercase tracking-widest text-pink-600 hover:text-pink-700"
                                            onClick={() => {
                                              setActivityToEdit(act);
                                              setIsActivityModalOpen(true);
                                            }}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:text-rose-700"
                                            onClick={() => {
                                              setForm((f) => ({
                                                ...f,
                                                activities: f.activities.filter(
                                                  (a) => a !== act,
                                                ),
                                              }));
                                            }}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.activityType || "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        {act.startDate
                                          ? new Date(
                                              act.startDate,
                                            ).toLocaleString([], {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                            })
                                          : "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        {act.endDate
                                          ? new Date(
                                              act.endDate,
                                            ).toLocaleString([], {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                            })
                                          : "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-bold text-slate-900 dark:text-white text-center">
                                        {act.durationMinutes || "0"}m
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.workDoneCode || "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.likelyCause ? "Yes" : "No"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.resolvedBy || "—"}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "Ticket Verification" && (
                      <div className="flex flex-col space-y-6 max-w-full mx-auto pb-4">
                        <Field
                          label="Ticket Resolution Verified By"
                          error={errors.ticketResolutionVerifiedBy}
                        >
                          <Combobox
                            value={form.ticketResolutionVerifiedBy}
                            onChange={setField("ticketResolutionVerifiedBy")}
                            options={apiData.assignees}
                            placeholder="Search users..."
                            error={errors.ticketResolutionVerifiedBy}
                          />
                        </Field>

                        <Field
                          label="Ticket Resolution Verified On By Sureze *"
                          error={errors.ticketResolutionVerifiedOn}
                        >
                          <div className="flex items-center w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all">
                            <Flatpickr
                              data-enable-time
                              value={form.ticketResolutionVerifiedOn}
                              onChange={(date, dateStr) => {
                                setForm((f) => ({
                                  ...f,
                                  ticketResolutionVerifiedOn: dateStr,
                                }));
                                if (errors.ticketResolutionVerifiedOn)
                                  setErrors((e) => ({
                                    ...e,
                                    ticketResolutionVerifiedOn: "",
                                  }));
                              }}
                              options={{
                                enableTime: true,
                                dateFormat: "Y-m-d",
                                time_24hr: true,
                              }}
                              className="w-full bg-transparent text-sm h-10 px-4 outline-none text-slate-700 dark:text-slate-200"
                              placeholder="YYYY-MM-DD"
                            />
                          </div>
                        </Field>

                        <Field
                          label="CMS Ticket Closed By"
                          error={errors.cmsTicketClosedBy}
                        >
                          <Combobox
                            value={form.cmsTicketClosedBy}
                            onChange={setField("cmsTicketClosedBy")}
                            options={apiData.assignees}
                            placeholder="Search users..."
                            error={errors.cmsTicketClosedBy}
                          />
                        </Field>

                        <Field
                          label="CMS Ticket Closed On *"
                          error={errors.cmsTicketClosedOn}
                        >
                          <div className="flex items-center w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all">
                            <Flatpickr
                              data-enable-time
                              value={form.cmsTicketClosedOn}
                              onChange={(date, dateStr) => {
                                setForm((f) => ({
                                  ...f,
                                  cmsTicketClosedOn: dateStr,
                                }));
                                if (errors.cmsTicketClosedOn)
                                  setErrors((e) => ({
                                    ...e,
                                    cmsTicketClosedOn: "",
                                  }));
                              }}
                              options={{
                                enableTime: true,
                                dateFormat: "Y-m-d",
                                time_24hr: true,
                              }}
                              className="w-full bg-transparent text-sm h-10 px-4 outline-none text-slate-700 dark:text-slate-200"
                              placeholder="YYYY-MM-DD"
                            />
                          </div>
                        </Field>

                        <Field
                          label="Service Closed Date *"
                          error={errors.serviceClosedDate}
                        >
                          <div className="flex items-center w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-4 focus-within:ring-pink-500/10 focus-within:border-pink-500 transition-all">
                            <Flatpickr
                              data-enable-time
                              value={form.serviceClosedDate}
                              onChange={(date, dateStr) => {
                                setForm((f) => ({
                                  ...f,
                                  serviceClosedDate: dateStr,
                                }));
                                if (errors.serviceClosedDate)
                                  setErrors((e) => ({
                                    ...e,
                                    serviceClosedDate: "",
                                  }));
                              }}
                              options={{
                                enableTime: true,
                                dateFormat: "Y-m-d",
                                time_24hr: true,
                              }}
                              className="w-full bg-transparent text-sm h-10 px-4 outline-none text-slate-700 dark:text-slate-200"
                              placeholder="YYYY-MM-DD"
                            />
                          </div>
                        </Field>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(true)}
                  disabled={submitting}
                  className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl bg-pink-600 text-white shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                >
                  {submitting
                    ? "Saving..."
                    : isEdit
                      ? "Update Ticket"
                      : "Create Ticket"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Modal */}
      <ActivityModal
        open={isActivityModalOpen}
        activity={activityToEdit}
        onClose={() => setIsActivityModalOpen(false)}
        onSubmit={(data) => {
          if (activityToEdit) {
            // Update existing
            setForm((f) => ({
              ...f,
              activities: (f.activities || []).map((a) =>
                a === activityToEdit ? data : a,
              ),
            }));
          } else {
            // Add new
            setForm((f) => ({
              ...f,
              activities: [...(f.activities || []), data],
            }));
          }
          setIsActivityModalOpen(false);
        }}
      />

      {/* Trigger existing new site modal */}
      <SiteModal
        open={isSiteModalOpen}
        onClose={() => setIsSiteModalOpen(false)}
        onSubmit={(data) => {
          console.log("Created site", data);
          setIsSiteModalOpen(false);
          // In real implementation you would refresh sites list here
        }}
      />

      {/* Placeholder for Customer Modal since it doesn't currently exist */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-[400px]">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              New Customer
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Existing customer form goes here. Implementation pending.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-6">
                <AlertCircle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter uppercase tracking-widest">
                Discard Changes?
              </h3>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-widest leading-relaxed">
                You have unsaved changes. Are you sure you want to exit?
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Stay
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:from-rose-600 hover:to-red-700 transition-all shadow-lg shadow-rose-500/20"
                >
                  Discard
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Date Warning Modal */}
      {showDateWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Warning
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Enter Recevied Date before adding an activity
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDateWarning(false)}
                className="flex-1 py-2.5 rounded-xl bg-pink-500 text-white text-sm hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 font-medium"
              >
                ok
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
