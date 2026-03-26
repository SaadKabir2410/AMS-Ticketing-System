import { useState, useEffect } from "react";
import { Dialog, IconButton } from "@mui/material";
import codeDetailsApi from "../../services/api/CodeDetails";

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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
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
  };

  const handleSubmitInternal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
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
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
    padding: '0 10px',
    fontSize: '10.5px',
    fontWeight: '700',
    color: '#0f172a',
    border: 'none',
    outline: 'none',
    width: '100%',
  };

  const labelStyle = {
    fontSize: '10.5px',
    fontWeight: '900',
    color: '#64748b',
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
        sx: { borderRadius: "12px", boxShadow: "none", border: "1px solid #e2e8f0" },
        className: "bg-white",
      }}
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-1">
        <h2 className="text-[18px] font-black text-slate-800 tracking-tighter uppercase leading-none">
          {isEdit ? "Update Detail" : "Create Detail"}
        </h2>
        <IconButton onClick={onClose} size="small" disabled={submitting}>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </IconButton>
      </div>

      <div className="px-6 py-4 max-h-[75vh] overflow-y-auto no-scrollbar">
        {error && (
          <div className="mb-4 p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold uppercase">
            {error}
          </div>
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
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          <div>
            <label style={labelStyle}>Lookup Code</label>
            <input
              type="text"
              name="lookupCode"
              value={formData.lookupCode}
              readOnly
              style={{ ...inputStyle, backgroundColor: '#f5f7f9', color: '#94a3b8' }}
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
              value={formData.sequence}
              onChange={handleChange}
              required
              style={inputStyle}
              disabled={submitting}
            />
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

          <div className="grid grid-cols-2 gap-y-3 pt-2 border-t border-slate-50">
            {[
              { label: "Default", name: "isDefaultIndicator" },
              { label: "Ex. Description", name: "hasExtraDescription" },
              { label: "Required", name: "isRequiredField" },
              { label: "Sub Category", name: "hasSubCategory" },
            ].map((check) => (
              <label key={check.name} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  name={check.name}
                  checked={formData[check.name]}
                  onChange={handleChange}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/10"
                />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter transition-colors group-hover:text-slate-800">
                  {check.label}
                </span>
              </label>
            ))}
          </div>
        </form>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
        <button
          onClick={onClose}
          className="h-[28px] px-5 rounded-lg text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition-all active:scale-95"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmitInternal}
          disabled={submitting}
          className="h-[28px] px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition-all active:scale-95"
        >
          {submitting ? "..." : isEdit ? "Update" : "Save"}
        </button>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
    </Dialog>
  );
}
