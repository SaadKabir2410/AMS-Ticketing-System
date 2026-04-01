import { useState, useEffect } from "react";
import { Dialog, IconButton } from "@mui/material";
import codeDetailsApi from "../../services/api/CodeDetails";
import PremiumErrorAlert from "./PremiumErrorAlert";



const EMPTY_FORM = {
  newCode: "",
  lookupCode: "",
  description: "",
  value1: "",
  value2: "",
  groupCode: "",
  groupCodeDetail: "",
  hasSubCategory: false,
  sequence: 0,
  isDefaultIndicator: false,
  isSystemIndicator: false,
  isRequiredField: false,
  hasExtraDescription: false,
  extraDescriptionLable: "",
  comments: "",
};

export default function CodeDetailsModal({
  open,
  onClose,
  onSubmit,
  item = null,
  selectedParent = null,
}) {
  const isEdit = !!item;
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fetchedRecord, setFetchedRecord] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setFieldErrors({});
      setSubmitting(false);

      if (isEdit && item) {
        const fetchFreshRecord = async () => {
          setSubmitting(true);
          try {
            const record = await codeDetailsApi.getById(item.id);
            setFetchedRecord(record);
            setFormData({
              newCode: record.newCode || "",
              lookupCode: record.lookupCode || "",
              description: record.description || "",
              value1: record.value1 || "",
              value2: record.value2 || "",
              groupCode: record.groupCode || "",
              groupCodeDetail: record.groupCodeDetail || "",
              hasSubCategory: !!record.hasSubCategory,
              sequence: record.sequence ?? 0,
              isDefaultIndicator: !!record.isDefaultIndicator,
              isSystemIndicator: !!record.isSystemIndicator,
              isRequiredField: !!record.isRequiredField,
              hasExtraDescription: !!record.hasExtraDescription,
              extraDescriptionLable: record.extraDescriptionLable || "",
              comments: record.comments || "",
            });
          } catch {
            setError("Failed to fetch record details.");
          } finally {
            setSubmitting(false);
          }
        };
        fetchFreshRecord();
      } else {
        setFetchedRecord(null);
        setFormData({
          ...EMPTY_FORM,
          lookupCode: selectedParent?.lookupCode || "",
          sequence: 0,
        });
      }
    }
  }, [open, isEdit, item, selectedParent]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError(null);
    if (fieldErrors[name]) setFieldErrors(prev => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const handleSubmitInternal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Client-side validation - build errors object
      const errors = {};
      if (!formData.newCode?.trim()) {
        errors.newCode = "Code field is required";
      }
      if (!formData.description?.trim()) {
        errors.description = "Description field is required";
      }
      const seq = Number(formData.sequence);
      if (isNaN(seq) || seq < 1 || seq > 2147483647) {
        errors.sequence = "Sequence field must be between 1 and 2147483647";
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        lookupId: selectedParent?.id,
        sequence: Number(formData.sequence),
        isActive: isEdit && fetchedRecord ? fetchedRecord.isActive : true,
        concurrencyStamp: isEdit && fetchedRecord ? fetchedRecord.concurrencyStamp : "",
      };
      await onSubmit(payload);
    } catch (err) {
      const apiError =
        err?.response?.data?.error?.validationErrors?.[0]?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        "An error occurred.";
      setError(apiError);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    height: '28px', // ULTRA SLIM
    backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#f1f5f9',
    borderRadius: '6px',
    padding: '0 10px',
    fontSize: '10.5px',
    fontWeight: '700',
    color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#0f172a',
    border: 'none',
    outline: 'none',
    width: '100%',
  };

  const labelStyle = {
    fontSize: '10.5px',
    fontWeight: '900',
    color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '3px',
    display: 'block',
    paddingLeft: '1px'
  };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") {
          onClose();
        }
      }}
      maxWidth="xs" // COMPACT VERTICAL MODAL
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          boxShadow: "none",
          border: "1px solid",
          borderColor: document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
          backgroundColor: document.documentElement.classList.contains('dark') ? '#000000' : '#ffffff'
        },
        className: "bg-white dark:bg-black transition-colors duration-300",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-1 bg-white dark:bg-black">
        <h2 className="text-[18px] font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-none">
          {isEdit ? "Update Detail" : "Create Detail"}
        </h2>
        <IconButton onClick={onClose} size="small" disabled={submitting}>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </IconButton>
      </div>

      <div className="px-6 py-4 max-h-[75vh] overflow-y-auto no-scrollbar dark:bg-black">
        {error && (
          <PremiumErrorAlert
            open={!!error}
            message={error}
            onClose={() => setError(null)}
          />
        )}

        {/* FULL WIDTH COMBO BOXES IN REQUESTED SEQUENCE */}
        <form onSubmit={handleSubmitInternal} className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Code <span className="text-rose-500">*</span></label>
            <input
              type="text"
              name="newCode"
              value={formData.newCode}
              onChange={handleChange}
              required
              maxLength={3}
              readOnly={isEdit}
              style={{
                ...inputStyle,
                ...(isEdit ? {
                  backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#f5f7f9',
                  color: '#64748b',
                  cursor: 'not-allowed'
                } : {})
              }}
              disabled={submitting}
            />
            {fieldErrors.newCode && <p className="text-[9px] text-rose-500 font-bold uppercase mt-1 ml-1">{fieldErrors.newCode}</p>}
          </div>


          <div>
            <label style={labelStyle}>Lookup Code</label>
            <input
              type="text"
              name="lookupCode"
              value={formData.lookupCode}
              readOnly
              style={{
                ...inputStyle,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#f5f7f9',
                color: '#64748b'
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Description <span className="text-rose-500">*</span></label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              style={inputStyle}
              disabled={submitting}
            />
            {fieldErrors.description && <p className="text-[9px] text-rose-500 font-bold uppercase mt-1 ml-1">{fieldErrors.description}</p>}
          </div>

          <div>
            <label style={labelStyle}>Value 1</label>
            <input
              type="text"
              name="value1"
              value={formData.value1}
              onChange={handleChange}
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          <div>
            <label style={labelStyle}>Value 2</label>
            <input
              type="text"
              name="value2"
              value={formData.value2}
              onChange={handleChange}
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          <div>
            <label style={labelStyle}>Group Code</label>
            <input
              type="text"
              name="groupCode"
              value={formData.groupCode}
              onChange={handleChange}
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          <div>
            <label style={labelStyle}>G.Code Detail</label>
            <input
              type="text"
              name="groupCodeDetail"
              value={formData.groupCodeDetail}
              onChange={handleChange}
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          <div>
            <label style={labelStyle}>Sequence <span className="text-rose-500">*</span></label>
            <input
              type="number"
              name="sequence"
              min="1"
              max="2147483647"
              value={formData.sequence}
              onChange={handleChange}
              required
              style={inputStyle}
              disabled={submitting}
            />
            {fieldErrors.sequence && <p className="text-[9px] text-rose-500 font-bold uppercase mt-1 ml-1">{fieldErrors.sequence}</p>}
          </div>

          <div>
            <label style={labelStyle}>Ex. Desc Label</label>
            <input
              type="text"
              name="extraDescriptionLable"
              value={formData.extraDescriptionLable}
              onChange={handleChange}
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          <div>
            <label style={labelStyle}>Comments</label>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              rows={2}
              style={{ ...inputStyle, height: '48px', padding: '6px 10px', resize: 'none' }}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-y-3 pt-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-black/50 p-3 rounded-lg">
            {[
              { label: "Default Indicator", name: "isDefaultIndicator" },
              { label: "Extra Description", name: "hasExtraDescription" },
              { label: "Required Field", name: "isRequiredField" },
              { label: "Has Sub Category", name: "hasSubCategory" },
            ].map((check) => (
              <label key={check.name} className="flex items-center gap-2.5 cursor-pointer group select-none">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    name={check.name}
                    checked={formData[check.name]}
                    onChange={handleChange}
                    className="peer appearance-none w-4 h-4 rounded border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 checked:bg-blue-600 checked:border-blue-600 transition-all duration-200 cursor-pointer shadow-sm"
                  />
                  <svg
                    className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter transition-colors group-hover:text-slate-800 dark:group-hover:text-white">
                  {check.label}
                </span>
              </label>
            ))}
          </div>
        </form>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-3 dark:bg-black rounded-b-xl">
        <button
          onClick={onClose}
          className="h-[30px] px-6 rounded-lg text-[10px] font-black uppercase text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95 transition-all duration-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmitInternal}
          disabled={submitting}
          className="h-[30px] px-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[10.5px] font-black uppercase shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Processing..." : isEdit ? "Update Code" : "Save"}
        </button>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
    </Dialog>
  );
}
