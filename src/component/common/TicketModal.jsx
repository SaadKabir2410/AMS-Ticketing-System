import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import PremiumErrorAlert from "./PremiumErrorAlert";



import { SITES, OCNS, ASSIGNEES, STATUSES } from "../../data/DB";

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

const EMPTY = {
  siteName: "",
  siteOcn: "",
  status: "Open",
  pre: false,
  createdBy: "",
  ticketClosedBy: "",
  totalDuration: "",
  cmsTicketClosedOn: "",
  serviceClosedDate: "",
  receivedAt: "",
};

export default function TicketModal({
  open,
  onClose,
  onSubmit,
  ticket = null,
  loading = false,
}) {
  const isEdit = !!ticket;
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevTicket, setPrevTicket] = useState(ticket);

  if (open !== prevOpen || ticket !== prevTicket) {
    setPrevOpen(open);
    setPrevTicket(ticket);
    if (open) {
      setErrors({});
      if (ticket) {
        setForm({
          siteName: ticket.siteName || "",
          siteOcn: ticket.siteOcn || "",
          status: ticket.status || "Open",
          pre: ticket.pre || false,
          createdBy: ticket.createdBy || "",
          ticketClosedBy: ticket.ticketClosedBy || "",
          totalDuration: ticket.totalDuration?.toString() || "",
          cmsTicketClosedOn: ticket.cmsTicketClosedOn
            ? ticket.cmsTicketClosedOn.slice(0, 16)
            : "",
          serviceClosedDate: ticket.serviceClosedDate
            ? ticket.serviceClosedDate.slice(0, 16)
            : "",
          receivedAt: ticket.receivedAt ? ticket.receivedAt.slice(0, 16) : "",
        });
      } else {
        setForm({
          ...EMPTY,
          receivedAt: new Date().toISOString().slice(0, 16),
        });
      }
    }
  }

  const set = (key) => (e) => {
    const val =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.siteName) errs.siteName = "Site name is required";
    if (!form.siteOcn) errs.siteOcn = "Site OCN is required";
    if (!form.createdBy) errs.createdBy = "Created by is required";
    if (!form.receivedAt) errs.receivedAt = "Received date is required";
    if (form.totalDuration && isNaN(Number(form.totalDuration)))
      errs.totalDuration = "Must be a number";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSubmit({
      ...form,
      totalDuration: parseFloat(form.totalDuration) || 0,
      cmsTicketClosedOn: form.cmsTicketClosedOn || null,
      serviceClosedDate: form.serviceClosedDate || null,
      receivedAt: form.receivedAt
        ? new Date(form.receivedAt).toISOString()
        : new Date().toISOString(),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <h2 className="text-lg text-slate-800 dark:text-white">
              {isEdit ? "Edit Ticket" : "New AMS Ticket"}
            </h2>
            {isEdit && ticket?.ticketNo && (
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {ticket.ticketNo}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-4">
            {errors.server && (
              <PremiumErrorAlert 
                open={!!errors.server} 
                message={errors.server} 
                onClose={() => setErrors(prev => ({ ...prev, server: null }))} 
              />
            )}


            {/* Row 1: Site Name + OCN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Site Name *" error={errors.siteName}>
                <select
                  value={form.siteName}
                  onChange={set("siteName")}
                  className={inputClass}
                >
                  <option value="">Select site...</option>
                  {SITES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Site OCN *" error={errors.siteOcn}>
                <select
                  value={form.siteOcn}
                  onChange={set("siteOcn")}
                  className={inputClass}
                >
                  <option value="">Select OCN...</option>
                  {OCNS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Row 2: Status + Created By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Status *" error={errors.status}>
                <select
                  value={form.status}
                  onChange={set("status")}
                  className={inputClass}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Created By *" error={errors.createdBy}>
                <select
                  value={form.createdBy}
                  onChange={set("createdBy")}
                  className={inputClass}
                >
                  <option value="">Select assignee...</option>
                  {ASSIGNEES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Row 3: Received Date + Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ticket Received Date *" error={errors.receivedAt}>
                <input
                  type="datetime-local"
                  value={form.receivedAt}
                  onChange={set("receivedAt")}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Total Duration (Hours)"
                error={errors.totalDuration}
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.totalDuration}
                  onChange={set("totalDuration")}
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Row 4: Ticket Closed By + CMS Closed On */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ticket Closed By" error={errors.ticketClosedBy}>
                <select
                  value={form.ticketClosedBy}
                  onChange={set("ticketClosedBy")}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {ASSIGNEES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="CMS Ticket Closed On"
                error={errors.cmsTicketClosedOn}
              >
                <input
                  type="datetime-local"
                  value={form.cmsTicketClosedOn}
                  onChange={set("cmsTicketClosedOn")}
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Row 5: Service Closed Date + PRE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Service Closed Date"
                error={errors.serviceClosedDate}
              >
                <input
                  type="datetime-local"
                  value={form.serviceClosedDate}
                  onChange={set("serviceClosedDate")}
                  className={inputClass}
                />
              </Field>
              <Field label="PRE">
                <div className="flex items-center gap-3 h-[42px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.pre}
                      onChange={set("pre")}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Mark as PRE
                    </span>
                  </label>
                </div>
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white text-sm transition-all shadow-lg shadow-blue-500/25"
            >
              {loading ? "Saving..." : isEdit ? "Update Ticket" : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
