import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  X,
  Search,
  ChevronDown,
  Check,
  Plus,
  Activity,
  Ticket,
  ShieldCheck,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PremiumErrorAlert from "./PremiumErrorAlert";
import SiteModal from "./SiteModal";
import ActivityModal from "./ActivityModal";
import { ActionsMenu } from "./ResourcePage";
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
        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-400 mb-1.5 group-focus-within/field:text-pink-600 transition-colors flex items-center gap-2">
          {label.includes("*") ? (
            <>
              {label.split("*")[0]}
              <span className="text-rose-500 animate-pulse">*</span>
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
          className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5 mt-1.5"
        >
          <AlertCircle size={10} strokeWidth={2.5} /> {error}
        </motion.p>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-transparent border-slate-500 bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm text-sm outline-none transition-all duration-300 focus:bg-white dark:focus:bg-slate-900 focus:border-pink-500/30 focus:ring-4 focus:ring-pink-500/10 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800/50 font-medium text-black dark:text-slate-200 placeholder:text-slate-500/80";

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

  const filteredOptions = (options || []).filter((opt) => {
    const label = opt.label || String(opt);
    return label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`${inputClass} flex items-center justify-between cursor-pointer ${disabled
          ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30"
          : ""
          } ${error ? "border-rose-500" : ""}`}
      >
        <div className="flex items-center gap-3 truncate">
          <Search size={14} className={`text-slate-400 group-focus-within:text-pink-500 transition-colors ${!value ? "opacity-50" : "opacity-100"}`} />
          <span
            className={`truncate ${!value ? "text-slate-600/80" : "text-black dark:text-white"
              }`}
          >
            {options?.find(opt => (opt.value || opt) === value)?.label || value || placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""
            } text-slate-400 shrink-0 ml-2`}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[100] mt-2 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[300px]"
          >
            <div className="p-3 border-b border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-transparent rounded-xl text-xs outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500/20 transition-all placeholder:text-slate-500/80"
                />
              </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 py-1.5">
              {loading ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="w-4 h-4 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading...</span>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-1.5">
                  <AlertCircle size={20} className="text-slate-300" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No results found</span>
                </div>
              ) : (
                <div className="px-2 space-y-0.5">
                  {filteredOptions.map((opt, idx) => {
                    const label = opt.label || String(opt);
                    const val = opt.value || opt;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onChange(val);
                          setOpen(false);
                          setSearch("");
                        }}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group/opt ${value === val
                          ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/80 hover:text-black dark:hover:text-white"
                          }`}
                      >
                        <span className="truncate">{label}</span>
                        {value === val && (
                          <motion.div
                            layoutId="active-check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Check size={14} strokeWidth={3} />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
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
  servicePlannedType: "",
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
  activities: [],
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
    servicePlannedTypes: [],
    incomingChannels: [],
  });

  const [rawSites, setRawSites] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [showActivityWarning, setShowActivityWarning] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({ ...EMPTY });
      setErrors({});
      setActiveTab("Ticket");
      setShowExitConfirm(false);
      setShowDateWarning(false);
      setShowActivityWarning(false);
      return;
    }

    setShowExitConfirm(false);
    setShowDateWarning(false);
    setShowActivityWarning(false);
    setErrors({});
    setActiveTab("Ticket");

    if (ticket) {
      setForm({
        ...EMPTY,
        ...ticket,
        siteName: ticket.siteId || ticket.siteName || "",
        customer: ticket.customerUserId || ticket.customer || "",
        ticketAssignedTo: ticket.ticketAssignedToId || ticket.ticketAssignedTo || "",
        ticketForwardedBy: ticket.ticketForwardedById || ticket.ticketForwardedBy || "",
        cmsTicketAddedBy: ticket.cmsTicketAddedById || ticket.cmsTicketAddedBy || "",
        receivedAt: ticket.receivedAt ? ticket.receivedAt.slice(0, 16) : "",
        cmsTicketAddedOn: ticket.cmsTicketAddedOn
          ? ticket.cmsTicketAddedOn.slice(0, 16)
          : "",
        ticketResolutionVerifiedOn: ticket.ticketResolutionVerifiedOn
          ? ticket.ticketResolutionVerifiedOn.slice(0, 10)
          : "",
        cmsTicketClosedOn: ticket.cmsTicketClosedOn
          ? ticket.cmsTicketClosedOn.slice(0, 10)
          : "",
        serviceClosedDate: ticket.serviceClosedDate
          ? ticket.serviceClosedDate.slice(0, 10)
          : "",
        isTicketForwarded: !!(ticket.ticketForwardedById || ticket.ticketForwardedBy),
        activities: ticket.activities || [],
      });

      amsTicketApi
        .getById(ticket.id)
        .then((fullData) => {
          setForm((prev) => ({
            ...prev,
            ...fullData,
            siteName: fullData.siteId || prev.siteName,
            customer: fullData.customerUserId || prev.customer,
            ticketAssignedTo: fullData.ticketAssignedToId || prev.ticketAssignedTo,
            ticketForwardedBy: fullData.ticketForwardedById || prev.ticketForwardedBy,
            cmsTicketAddedBy: fullData.cmsTicketAddedById || prev.cmsTicketAddedBy,
            receivedAt: fullData.receivedAt
              ? fullData.receivedAt.slice(0, 16)
              : prev.receivedAt,
            cmsTicketAddedOn: fullData.cmsTicketAddedOn
              ? fullData.cmsTicketAddedOn.slice(0, 16)
              : prev.cmsTicketAddedOn,
            ticketResolutionVerifiedOn: fullData.ticketResolutionVerifiedOn
              ? fullData.ticketResolutionVerifiedOn.slice(0, 10)
              : prev.ticketResolutionVerifiedOn,
            cmsTicketClosedOn: fullData.cmsTicketClosedOn
              ? fullData.cmsTicketClosedOn.slice(0, 10)
              : prev.cmsTicketClosedOn,
            serviceClosedDate: fullData.serviceClosedDate
              ? fullData.serviceClosedDate.slice(0, 10)
              : prev.serviceClosedDate,
            isTicketForwarded: !!(fullData.ticketForwardedById || fullData.ticketForwardedBy),
            activities: fullData.activities || prev.activities || [],
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
  }, [open, isEdit, user]);

  useEffect(() => {
    if (open && !isEdit && user) {
      setForm((prev) => ({
        ...prev,
        cmsTicketAddedBy: user.id || "",
        cmsTicketAddedOn: new Date().toISOString().slice(0, 16),
        receivedAt: new Date().toISOString().slice(0, 16),
      }));
    }
  }, [open, isEdit, user]);

  useEffect(() => {
    Promise.all([
      sitesApi.getAll({ perPage: 1000 }).catch(() => ({ items: [] })),
      usersApi.getUsersList().catch(() => []),
      usersApi
        .getUsersList({
          organizationTypes: [2, 3],
          onlyLoadCurrentUser: false,
        })
        .catch(() => []),
      codeDetailsApi
        .getListByLookupCodes({
          lookupCodes: [
            "TicketType",
            "TicketIncomingChannel",
            "ServicePlannedType",
          ],
        })
        .catch(() => ({})),
    ])
      .then(([sitesRes, usersRes, itsUsersRes, lookupsRes]) => {
        const fetchedSites = sitesRes?.items || [];
        setRawSites(fetchedSites);

        const ticketTypes = (lookupsRes["TicketType"] || [])
          .map((item) => item.description || item.newCode)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        const servicePlannedTypes = (lookupsRes["ServicePlannedType"] || [])
          .map((item) => item.description || item.newCode)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        const incomingChannels = (lookupsRes["TicketIncomingChannel"] || [])
          .map((item) => item.description || item.newCode)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));

        setApiData((prev) => ({
          ...prev,

          siteNames: fetchedSites
            .filter(Boolean)
            .map((s) => ({
              label: s.name || s.Name || "",
              value: s.id,
              raw: s,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),

          assignees: (usersRes || [])
            .map((u) => ({
              label: u.name || u.userName || "",
              value: u.id,
            }))
            .filter((u) => u.label)
            .sort((a, b) => a.label.localeCompare(b.label)),

          itsUsers: (itsUsersRes || [])
            .filter(Boolean)
            .map((u) => ({
              label: u.name || u.userName || "",
              value: u.id,
              raw: u,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
          ticketTypes:
            ticketTypes.length > 0
              ? ticketTypes
              : ["Service Planned", "Service Demand", "Inquiry", "Complaint"],
          servicePlannedTypes:
            servicePlannedTypes.length > 0
              ? servicePlannedTypes
              : [
                "Report",
                "Rule",
                "Installation",
                "Configuration",
                "TSB",
                "Others",
              ],
          incomingChannels:
            incomingChannels.length > 0
              ? incomingChannels
              : [
                "Whatsapp/viber",
                "Phone Call",
                "Email",
                "Teams"
              ].sort((a, b) =>
                a.localeCompare(b),
              ),
        }));
      })
      .finally(() => {
        setLoadingApis(false);
      });
  }, [open, ticket]);

  useEffect(() => {
    if (!form.siteName) {
      setApiData((prev) => ({ ...prev, customers: [] }));
      return;
    }

    const selectedSite = rawSites.find((s) => s.id === form.siteName);

    if (selectedSite && selectedSite.id) {
      setLoadingCustomers(true);
      usersApi
        .getCustomerUsers(selectedSite.id)
        .then((res) => {
          const customers = (res?.items || res || [])
            .map((c) => ({
              label: c.name || c.userName || "",
              value: c.id,
            }))
            .filter((c) => c.label)
            .sort((a, b) => a.label.localeCompare(b.label));
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

    if (errors[key]) {
      setErrors((errs) => ({ ...errs, [key]: "" }));
    }
  };

  const handleTicketTypeChange = (value) => {
    setForm((f) => ({
      ...f,
      ticketType: value,
      servicePlannedType: value === "Service Planned" ? f.servicePlannedType : "",
    }));

    setErrors((errs) => ({
      ...errs,
      ticketType: "",
      servicePlannedType: value === "Service Planned" ? errs.servicePlannedType : "",
    }));
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

    const newErrors = {};
    const now = new Date();

    // 1. Ticket Received Date validation
    if (!form.receivedAt) {
      newErrors.receivedAt = "Ticket Received Date is required";
    } else {
      const receivedDate = new Date(form.receivedAt);
      if (receivedDate > now) {
        newErrors.receivedAt = "Ticket Received Date can not be more than today's date";
      }
    }

    // 2. CMS Ticket Added On validation
    if (form.cmsTicketAddedOn) {
      const addedOnDate = new Date(form.cmsTicketAddedOn);
      if (addedOnDate > now) {
        newErrors.cmsTicketAddedOn = "CMS Ticket Added On can not be more than today's date";
      }
    }

    // 3. Ticket Forwarded By validation
    if (form.isTicketForwarded && !form.ticketForwardedBy) {
      newErrors.ticketForwardedBy = "Ticket Forwarded By is required";
    }

    // Other required fields (optional, but good practice based on UI stars)
    if (!form.siteName) newErrors.siteName = "Site Name is required";
    if (!form.customer) newErrors.customer = "Customer is required";
    if (!form.ticketAssignedTo) newErrors.ticketAssignedTo = "Assigned To is required";
    if (!form.ticketType) newErrors.ticketType = "Ticket Type is required";
    if (form.ticketType === "Service Planned" && !form.servicePlannedType) {
      newErrors.servicePlannedType = "Service Planned Type is required";
    }
    if (!form.issueDescription) newErrors.issueDescription = "Issue Description is required";
    if (!form.ticketIncomingChannel) newErrors.ticketIncomingChannel = "Channel is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      // Optional: scroll to or focus first error, but for now just setting state is enough
      toast("Please fix the errors before submitting.", "error");
      return;
    }

    if (!form.activities || form.activities.length === 0) {
      setShowActivityWarning(true);
      return;
    }

    onSubmit({
      ...form,
      totalDuration: parseFloat(form.totalDuration) || 0,
    });
  };

  if (!open) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60"
            />

            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-6xl bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-auto max-h-[95vh] overflow-hidden font-[Arial]"
            >
              <div className="flex flex-col gap-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-600 shrink-0">
                      <Ticket size={24} />
                    </div>
                    <div>
                      <nav className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-500 mb-0.5">
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
                    type="button"
                    onClick={() => setShowExitConfirm(true)}
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all border border-slate-200 dark:border-slate-700"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>

                <div className="flex px-8 gap-10">
                  {["Ticket", "Activities", "Ticket Verification"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`relative py-4 text-[12px] font-semibold transition-all flex items-center gap-2 group ${activeTab === tab
                        ? "text-pink-600"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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
                  ))}
                </div>
              </div>

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
                      <div className="flex flex-col space-y-8">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-600 shrink-0">
                            <Activity size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                              Ticket Information
                            </h3>
                            <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                              Basic details and documentation for this request
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
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
                                    <p className="text-[11px] font-semibold text-slate-400 mt-1">
                                      {form.pdfFile
                                        ? `${(form.pdfFile.size / 1024 / 1024).toFixed(2)} MB`
                                        : "PDF format only (Max 10MB)"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </Field>
                          </div>

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
                                  if (errors.receivedAt) {
                                    setErrors((e) => ({ ...e, receivedAt: "" }));
                                  }
                                }}
                                options={{
                                  enableTime: true,
                                  dateFormat: "Y-m-d\\TH:i",
                                  time_24hr: true,
                                }}
                                className={`${inputClass} !pr-10 ${errors.receivedAt
                                  ? "border-rose-500 text-rose-600"
                                  : ""
                                  }`}
                                placeholder="YYYY-MM-DD HH:MM"
                              />
                              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors pointer-events-none">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                          </Field>

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
                                    className="w-[42px] h-[42px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-pink-600 rounded-xl hover:bg-pink-600 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                                    title="Add New Site"
                                  >
                                    <Plus size={18} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                            </Field>
                          </div>

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
                                    className="w-[42px] h-[42px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-pink-600 rounded-xl hover:bg-pink-600 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                                    title="Add New Customer"
                                  >
                                    <Plus size={18} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                            </Field>
                          </div>

                          <Field
                            label="Ticket Assigned To *"
                            error={errors.ticketAssignedTo}
                          >
                            <Combobox
                              value={form.ticketAssignedTo}
                              onChange={setField("ticketAssignedTo")}
                              options={apiData.itsUsers}
                              placeholder={
                                loadingApis
                                  ? "Loading Users..."
                                  : "Search users..."
                              }
                              disabled={loadingApis}
                              error={errors.ticketAssignedTo}
                            />
                          </Field>

                          <Field label="Ticket Type *" error={errors.ticketType}>
                            <Combobox
                              value={form.ticketType}
                              onChange={handleTicketTypeChange}
                              options={apiData.ticketTypes}
                              placeholder={
                                loadingApis
                                  ? "Loading Types..."
                                  : "Select An Option"
                              }
                              disabled={loadingApis}
                              error={errors.ticketType}
                            />
                          </Field>

                          {form.ticketType === "Service Planned" && (
                            <div className="md:col-span-2">
                              <Field
                                label="Service Planned Type *"
                                error={errors.servicePlannedType}
                              >
                                <Combobox
                                  value={form.servicePlannedType}
                                  onChange={setField("servicePlannedType")}
                                  options={apiData.servicePlannedTypes}
                                  placeholder="Select An Option"
                                  disabled={loadingApis}
                                  error={errors.servicePlannedType}
                                />
                              </Field>
                            </div>
                          )}

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
                                  className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.isTicketForwarded
                                    ? "bg-pink-600 shadow-lg shadow-pink-500/20"
                                    : "bg-slate-300 dark:bg-slate-700"
                                    }`}
                                />
                                <motion.div
                                  animate={{ x: form.isTicketForwarded ? 18 : 2 }}
                                  className="absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md transition-all"
                                />
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Forwarded
                              </span>
                            </label>
                          </div>

                          <Field
                            label="Ticket Forwarded By"
                            error={errors.ticketForwardedBy}
                          >
                            <Combobox
                              value={form.ticketForwardedBy}
                              onChange={setField("ticketForwardedBy")}
                              options={apiData.itsUsers}
                              placeholder="Search users..."
                              disabled={!form.isTicketForwarded || loadingApis}
                              error={errors.ticketForwardedBy}
                            />
                          </Field>

                          <Field
                            label="CMS Ticket Added By"
                            error={errors.cmsTicketAddedBy}
                          >
                            <Combobox
                              value={form.cmsTicketAddedBy}
                              onChange={setField("cmsTicketAddedBy")}
                              options={apiData.itsUsers}
                              placeholder="Search users..."
                              disabled={loadingApis}
                              error={errors.cmsTicketAddedBy}
                            />
                          </Field>

                          <Field
                            label="CMS Ticket Added On *"
                            error={errors.cmsTicketAddedOn}
                          >
                            <div className="relative group/input">
                              <Flatpickr
                                data-enable-time
                                value={form.cmsTicketAddedOn}
                                onChange={(date, dateStr) => {
                                  setForm((f) => ({
                                    ...f,
                                    cmsTicketAddedOn: dateStr,
                                  }));
                                  if (errors.cmsTicketAddedOn) {
                                    setErrors((e) => ({
                                      ...e,
                                      cmsTicketAddedOn: "",
                                    }));
                                  }
                                }}
                                options={{
                                  enableTime: true,
                                  dateFormat: "Y-m-d\\TH:i",
                                  time_24hr: true,
                                }}
                                className={`${inputClass} !pr-10 ${errors.cmsTicketAddedOn
                                  ? "border-rose-500 text-rose-600"
                                  : ""
                                  }`}
                                placeholder="YYYY-MM-DD HH:MM"
                              />
                              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-pink-500 transition-colors pointer-events-none">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                          </Field>

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
                                  className={`block w-10 h-6 rounded-full transition-all duration-300 ${form.pre
                                    ? "bg-pink-600 shadow-[0_0_15px_rgba(219,39,119,0.3)]"
                                    : "bg-slate-300 dark:bg-slate-700"
                                    }`}
                                />
                                <motion.div
                                  animate={{ x: form.pre ? 18 : 2 }}
                                  className="absolute left-0 top-1 bg-white w-4 h-4 rounded-full shadow-md transition-all"
                                />
                              </div>
                              <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-400">
                                PRE
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "Activities" && (
                      <div className="flex flex-col h-full space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                              <History size={20} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Ticket Activities
                              </h3>
                              <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                                Manage chronological service records
                              </p>
                            </div>
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
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Actions
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Activity Type
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Start Date
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    End Date
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 text-center">
                                    Duration
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Work Done Code
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Likely Cause
                                  </th>
                                  <th className="px-6 py-4 text-[11px] font-semibold text-slate-500">
                                    Resolved By
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {!form.activities || form.activities.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan="8"
                                      className="px-6 py-12 text-center text-[11px] font-semibold text-slate-400"
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
                                        <ActionsMenu
                                          onEdit={() => {
                                            setActivityToEdit(act);
                                            setIsActivityModalOpen(true);
                                          }}
                                          onDelete={() => {
                                            setForm((f) => ({
                                              ...f,
                                              activities: f.activities.filter(
                                                (a) => a !== act,
                                              ),
                                            }));
                                          }}
                                        />
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                        {act.activityType || "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        {act.startDate
                                          ? new Date(act.startDate).toLocaleString([], {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                          })
                                          : "—"}
                                      </td>
                                      <td className="px-6 py-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        {act.endDate
                                          ? new Date(act.endDate).toLocaleString([], {
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
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                              Ticket Verification
                            </h3>
                            <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                              Review and finalize the ticket resolution details
                            </p>
                          </div>
                        </div>
                        <Field
                          label="Ticket Resolution Verified By"
                          error={errors.ticketResolutionVerifiedBy}
                        >
                          <Combobox
                            value={form.ticketResolutionVerifiedBy}
                            onChange={setField("ticketResolutionVerifiedBy")}
                            options={apiData.itsUsers}
                            placeholder="Search users..."
                            disabled={loadingApis}
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
                                if (errors.ticketResolutionVerifiedOn) {
                                  setErrors((e) => ({
                                    ...e,
                                    ticketResolutionVerifiedOn: "",
                                  }));
                                }
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
                            options={apiData.itsUsers}
                            placeholder="Search users..."
                            disabled={loadingApis}
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
                                if (errors.cmsTicketClosedOn) {
                                  setErrors((e) => ({
                                    ...e,
                                    cmsTicketClosedOn: "",
                                  }));
                                }
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
                                if (errors.serviceClosedDate) {
                                  setErrors((e) => ({
                                    ...e,
                                    serviceClosedDate: "",
                                  }));
                                }
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
                  type="button"
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

      <ActivityModal
        open={isActivityModalOpen}
        activity={activityToEdit}
        onClose={() => setIsActivityModalOpen(false)}
        onSubmit={(data) => {
          if (activityToEdit) {
            setForm((f) => ({
              ...f,
              activities: (f.activities || []).map((a) =>
                a === activityToEdit ? data : a,
              ),
            }));
          } else {
            setForm((f) => ({
              ...f,
              activities: [...(f.activities || []), data],
            }));
          }
          setIsActivityModalOpen(false);
        }}
      />

      <SiteModal
        open={isSiteModalOpen}
        onClose={() => setIsSiteModalOpen(false)}
        onSubmit={(data) => {
          console.log("Created site", data);
          setIsSiteModalOpen(false);
        }}
      />

      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm font-[Arial]">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-[400px]">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              New Customer
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Existing customer form goes here. Implementation pending.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl p-8 text-center font-[Arial]"
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
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Stay
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
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

      {showDateWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center animate-fade-in font-[Arial]">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Warning
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Enter Recevied Date before adding an activity
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDateWarning(false)}
                className="flex-1 py-2.5 rounded-xl bg-pink-500 text-white text-sm hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20 font-medium"
              >
                ok
              </button>
            </div>
          </div>
        </div>
      )}

      {showActivityWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center animate-fade-in font-[Arial]">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Warning
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Please add at least one activity before saving
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowActivityWarning(false)}
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
