import { useState, useEffect } from "react";
import { AlertCircle, X, Plus } from "lucide-react";
import PremiumErrorAlert from "./PremiumErrorAlert";
import SiteModal from "./SiteModal";

import { usersApi } from "../../services/api/users";
import { sitesApi } from "../../services/api/sites";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";

function Field({ label, error, children }) {
  return (
    <div className="space-y-2 flex flex-col">
      {label && (
        <label className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {label.includes('*') ? (
            <>{label.split('*')[0]}<span className="text-[#e91e63] ml-0.5">*</span></>
          ) : (
            label
          )}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

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
};

export default function TicketModal({
  open,
  onClose,
  onSubmit,
  ticket = null,
  submitting = false,
}) {
  const isEdit = !!ticket;
  const [activeTab, setActiveTab] = useState("Ticket");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const [loadingApis, setLoadingApis] = useState(false);
  const [apiData, setApiData] = useState({
    siteNames: [],
    customers: [],
    assignees: [],
    ticketTypes: []
  });
  const [rawSites, setRawSites] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  // Placeholder for customer modal if it existed
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setActiveTab("Ticket");
      if (ticket) {
        setForm({
          ...EMPTY,
          ...ticket,
          receivedAt: ticket.receivedAt ? ticket.receivedAt.slice(0, 16) : "",
          cmsTicketAddedOn: ticket.cmsTicketAddedOn ? ticket.cmsTicketAddedOn.slice(0, 16) : "",
          isTicketForwarded: !!ticket.ticketForwardedBy,
        });
      } else {
        setForm({
          ...EMPTY,
          receivedAt: new Date().toISOString().slice(0, 16),
          cmsTicketAddedOn: new Date().toISOString().slice(0, 16),
        });
      }

      setLoadingApis(true);
      Promise.all([
        sitesApi.getAll({ perPage: 1000 }).catch(() => ({ items: [] })),
        usersApi.getUsersList().catch(() => []),
      ])
        .then(([sitesRes, usersRes]) => {
          const fetchedSites = sitesRes?.items || [];
          setRawSites(fetchedSites);
          setApiData((prev) => ({
            ...prev,
            siteNames: fetchedSites.map(s => s.name || s.Name).filter(Boolean),
            assignees: (usersRes || []).map(u => u.name || u.userName).filter(Boolean),
            ticketTypes: ["Hardware", "Software", "Network", "General Inquiry"],
          }));
        })
        .finally(() => {
          setLoadingApis(false);
        });
    }
  }, [open, ticket]);

  // Fetch customers when siteName changes
  useEffect(() => {
    if (!form.siteName) {
      setApiData(prev => ({ ...prev, customers: [] }));
      return;
    }

    const selectedSite = rawSites.find(
      (s) => s.name === form.siteName || s.Name === form.siteName
    );

    if (selectedSite && selectedSite.id) {
      setLoadingCustomers(true);
      usersApi.getCustomerUsers(selectedSite.id)
        .then((res) => {
          const customers = (res?.items || res || []).map(c => c.name || c.userName).filter(Boolean);
          setApiData(prev => ({ ...prev, customers }));
        })
        .catch(() => {
          setApiData(prev => ({ ...prev, customers: [] }));
        })
        .finally(() => {
          setLoadingCustomers(false);
        });
    }
  }, [form.siteName, rawSites]);

  const setField = (key) => (e) => {
    let val = e.target.value;
    if (e.target.type === "checkbox") {
      val = e.target.checked;
    } else if (e.target.type === "file") {
      val = e.target.files[0];
    }
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: "" }));
  };

  const handleToggleForwarded = (e) => {
    const isChecked = e.target.checked;
    setForm(f => ({ ...f, isTicketForwarded: isChecked, ticketForwardedBy: isChecked ? f.ticketForwardedBy : "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      totalDuration: parseFloat(form.totalDuration) || 0,
    });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop (Does NOT close the modal on click as per requirements) */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* Modal */}
        <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col min-h-[85vh] max-h-[95vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-lg text-slate-800 dark:text-white font-semibold">
                {isEdit ? "Edit Ticket" : "New AMS Ticket"}
              </h2>
            </div>
            {/* Close icon ONLY closes the modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-all outline-none"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-6 border-b border-slate-100 dark:border-slate-700 gap-6">
            {["Ticket", "Activities", "Ticket Verification"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab
                  ? "border-[#e91e63] text-[#e91e63]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 py-3">
            {errors.server && (
              <PremiumErrorAlert
                open={!!errors.server}
                message={errors.server}
                onClose={() => setErrors(prev => ({ ...prev, server: null }))}
              />
            )}

            {activeTab === "Ticket" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* 1. Upload PDF */}
                <div className="md:col-span-2">
                  <Field label="Upload PDF" error={errors.pdfFile}>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={setField("pdfFile")}
                      className="w-full max-w-sm text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-l-lg file:border-0 file:border-r file:border-slate-200 file:text-xs file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50 transition-all border border-slate-200 rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </Field>
                </div>

                {/* 2. Ticket Received Date Time */}
                <Field label="Ticket Received Date Time *" error={errors.receivedAt}>
                  <Flatpickr
                    data-enable-time
                    value={form.receivedAt}
                    onChange={(date, dateStr) => {
                      setForm(f => ({ ...f, receivedAt: dateStr }));
                      if (errors.receivedAt) setErrors(e => ({ ...e, receivedAt: "" }));
                    }}
                    options={{ enableTime: true, dateFormat: "Y-m-d\\TH:i", time_24hr: true }}
                    className={`${inputClass} ${errors.receivedAt ? 'border-[#e91e63] text-[#e91e63]' : ''}`}
                    placeholder="DD/MM/YYYY"
                  />
                </Field>

                {/* 3. CMS Next Ticket No */}
                <Field label="CMS Next Ticket No *" error={errors.cmsNextTicketNo}>
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
                    <div className="flex items-center gap-2">
                      <select
                        value={form.siteName}
                        onChange={setField("siteName")}
                        className={`${inputClass} flex-1`}
                        disabled={loadingApis}
                      >
                        <option value="">
                          {loadingApis ? "Loading Sites..." : "Search sites..."}
                        </option>
                        {apiData.siteNames.map((site) => (
                          <option key={site} value={site}>{site}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsSiteModalOpen(true)}
                        className="p-1.5 px-3 bg-white border border-blue-400 text-blue-500 rounded-lg hover:bg-blue-50 transition-all dark:bg-slate-800"
                        title="New Site"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </Field>
                </div>

                {/* 5. Customer */}
                <div className="md:col-span-2">
                  <Field label="Customer *" error={errors.customer}>
                    <div className="flex items-center gap-2">
                      <select
                        value={form.customer}
                        onChange={setField("customer")}
                        className={`${inputClass} flex-1 ${!form.siteName ? 'opacity-50 bg-slate-100 cursor-not-allowed dark:opacity-70 dark:bg-slate-800' : ''}`}
                        disabled={loadingApis || loadingCustomers || !form.siteName}
                      >
                        <option value="">
                          {!form.siteName 
                            ? "Select Site Name first..." 
                            : loadingCustomers ? "Loading Customers..." : "Search customers..."}
                        </option>
                        {apiData.customers.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>

                {/* 6. Ticket Assigned To */}
                <Field label="Ticket Assigned To *" error={errors.ticketAssignedTo}>
                  <select
                    value={form.ticketAssignedTo}
                    onChange={setField("ticketAssignedTo")}
                    className={inputClass}
                    disabled={loadingApis}
                  >
                    <option value="">
                      {loadingApis ? "Loading Assignees..." : "Search users..."}
                    </option>
                    {apiData.assignees.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </Field>

                {/* 7. Ticket Type */}
                <Field label="Ticket Type *" error={errors.ticketType}>
                  <select
                    value={form.ticketType}
                    onChange={setField("ticketType")}
                    className={inputClass}
                    disabled={loadingApis}
                  >
                    <option value="">
                      {loadingApis ? "Loading Types..." : "Select An Option"}
                    </option>
                    {apiData.ticketTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                {/* 8 & 9. Ticket Incoming Channel AND Forward Toggle */}
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Field label="Ticket Incoming Channel *" error={errors.ticketIncomingChannel}>
                      <select
                        value={form.ticketIncomingChannel}
                        onChange={setField("ticketIncomingChannel")}
                        className={inputClass}
                      >
                        <option value="">Select An Option</option>
                        <option value="Email">Email</option>
                        <option value="Phone">Phone</option>
                        <option value="Portal">Portal</option>
                        <option value="Direct">Direct</option>
                      </select>
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer w-max mb-1.5">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.isTicketForwarded}
                        onChange={handleToggleForwarded}
                      />
                      <div className={`block w-8 h-4 rounded-full transition-colors ${form.isTicketForwarded ? "bg-[#e91e63]" : "bg-slate-300 dark:bg-slate-600"}`}></div>
                      <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${form.isTicketForwarded ? "transform translate-x-4" : ""}`}></div>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Ticket Forwarded</span>
                  </label>
                </div>

                {/* Ticket Forwarded By (Input) */}
                <Field label="Ticket Forwarded By" error={errors.ticketForwardedBy}>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={form.ticketForwardedBy}
                    onChange={setField("ticketForwardedBy")}
                    disabled={!form.isTicketForwarded}
                    className={`${inputClass} ${!form.isTicketForwarded ? 'opacity-60 bg-slate-100' : ''}`}
                  />
                </Field>

                {/* 10. CMS Ticket Added By */}
                <Field label="CMS Ticket Added By" error={errors.cmsTicketAddedBy}>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={form.cmsTicketAddedBy}
                    onChange={setField("cmsTicketAddedBy")}
                    className={inputClass}
                  />
                </Field>

                {/* 11. CMS Ticket Added On */}
                <Field label="CMS Ticket Added On *" error={errors.cmsTicketAddedOn}>
                  <Flatpickr
                    data-enable-time
                    value={form.cmsTicketAddedOn}
                    onChange={(date, dateStr) => {
                      setForm(f => ({ ...f, cmsTicketAddedOn: dateStr }));
                      if (errors.cmsTicketAddedOn) setErrors(e => ({ ...e, cmsTicketAddedOn: "" }));
                    }}
                    options={{ enableTime: true, dateFormat: "Y-m-d\\TH:i", time_24hr: true }}
                    className={inputClass}
                    placeholder="DD/MM/YYYY"
                  />
                </Field>

                {/* 12. Issue Description */}
                <div className="md:col-span-1">
                  <Field label="Issue Description *" error={errors.issueDescription}>
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
                  <Field label="Possible Root Cause" error={errors.possibleRootCause}>
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
                  <Field label="Total Duration (Hours)" error={errors.totalDuration}>
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
                  <label className="flex items-center gap-2 cursor-pointer w-max">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.pre}
                        onChange={setField("pre")}
                      />
                      <div className={`block w-8 h-4 rounded-full transition-colors ${form.pre ? "bg-[#e91e63]" : "bg-slate-300 dark:bg-slate-600"}`}></div>
                      <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${form.pre ? "transform translate-x-4" : ""}`}></div>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">PRE</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "Activities" && (
              <div className="p-4 text-center text-slate-500 italic">
                Activities placeholder text.
              </div>
            )}

            {activeTab === "Ticket Verification" && (
              <div className="p-4 text-center text-slate-500 italic">
                Ticket Verification placeholder text.
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium rounded-xl bg-pink-600 text-white hover:bg-pink-700 transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </div>
      </div>

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
            <h3 className="text-lg font-semibold mb-4 dark:text-white">New Customer</h3>
            <p className="text-sm text-slate-500 mb-6">Existing customer form goes here. Implementation pending.</p>
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
    </>
  );
}


