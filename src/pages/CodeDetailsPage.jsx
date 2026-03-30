import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import codeDetailsApi from "../services/api/CodeDetails";
import codesApi from "../services/api/Code";
import { useToast } from "../component/common/ToastContext";
import { Autocomplete, TextField, Checkbox } from "@mui/material";
import CodeDetailsModal from "../component/common/CodeDetailsModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { ActionsMenu } from "../component/common/ResourcePage";
import { Edit3, Activity, Power, CheckCircle, ChevronRight, Search } from "lucide-react";

// --- Text Highlighter ---
const HighlightText = ({ text, term }) => {
  if (!term || !text) return text ?? "—";
  const str = String(text);
  const index = str.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return str;
  return (
    <>
      {str.slice(0, index)}
      <mark className="bg-yellow-200 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-100 px-0.5 rounded-[1px] border border-yellow-300 dark:border-yellow-500/30">
        {str.slice(index, index + term.length)}
      </mark>
      {str.slice(index + term.length)}
    </>
  );
};

export default function CodeDetailsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [parentCodes, setParentCodes] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [loadingParents, setLoadingParents] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [codeDetails, setCodeDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    newCode: "",
    lookupCode: "",
    description: "",
    value1: "",
    value2: "",
    groupCode: "",
    groupCodeDetail: "",
    sequence: "",
    extraDescriptionLable: "",
  });
  const [parentSearch, setParentSearch] = useState("");

  const loadParentCodes = async () => {
    setLoadingParents(true);
    try {
      const data = await codesApi.getAll();
      setParentCodes(data);
    } catch (err) {
      toast("Failed to load lookup codes", "error");
    } finally {
      setLoadingParents(false);
    }
  };

  const fetchCodeDetails = async () => {
    if (!selectedParent) return;
    setLoadingDetails(true);
    try {
      const data = await codeDetailsApi.getAll({
        lookupId: selectedParent.id,
      });
      setCodeDetails(data);
    } catch (err) {
      toast("Failed to load code details", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => { loadParentCodes(); }, []);
  useEffect(() => { fetchCodeDetails(); }, [selectedParent, filters]);

  const handleClearAll = () => {
    setSelectedParent(null);
    setFilters({
      newCode: "",
      description: "",
      value1: "",
      value2: "",
      groupCode: "",
      groupCodeDetail: "",
      sequence: "",
      extraDescriptionLable: "",
    });
    setResetKey(prev => prev + 1);
  };

  // --- Real-time Local Filtering ---
  const filteredData = codeDetails.filter(row => {
    return Object.keys(filters).every(key => {
      const term = filters[key];
      if (!term) return true;
      const cellVal = String(row[key] || "");
      return cellVal.toLowerCase().includes(term.toLowerCase());
    });
  });

  const handleCreate = async (payload) => {
    try {
      const finalPayload = {
        ...payload,
        lookupId: selectedParent?.id,
        lookupCode: selectedParent?.lookupCode
      };
      await codeDetailsApi.create(finalPayload);
      toast("Code detail created successfully!");
      setModalOpen(false);
      fetchCodeDetails();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      await codeDetailsApi.update(id, { ...payload, lookupId: selectedParent?.id });
      toast("Code detail updated successfully!");
      setActionItem(null);
      setActionType("");
      fetchCodeDetails();
    } catch (err) {
      throw err;
    }
  };

  // ── Confirm disable/enable (same pattern as CodePage.jsx) ──────────────────
  const confirmAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      if (actionType === "disable") {
        await codeDetailsApi.disable(actionItem.id);
        toast("Record disabled successfully!");
      } else if (actionType === "enable") {
        await codeDetailsApi.enable(actionItem.id);
        toast("Record enabled successfully!");
      }
      fetchCodeDetails();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "An error occurred.";
      toast(`Failed to ${actionType} record: ${msg}`, "error");
    } finally {
      setActionLoading(false);
      setActionItem(null);
      setActionType("");
    }
  };

  const columns = [
    { key: "newCode", label: "CODE", width: 70 },
    { key: "lookupCode", label: "LOOKUP CODE", width: 90 },
    { key: "description", label: "DESCRIPTION", width: 165 },
    { key: "value1", label: "VALUE 1", width: 62 },
    { key: "value2", label: "VALUE 2", width: 62 },
    { key: "groupCode", label: "GROUP CODE", width: 90 },
    { key: "groupCodeDetail", label: "GROUP CODE DETAIL", width: 120 },
    {
      key: "hasSubCategory",
      label: "HAS SUB CATEGORY",
      width: 100,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#3b82f6' } }} />
    },
    { key: "sequence", label: "SEQUENCE", width: 60 },
    {
      key: "isDefaultIndicator",
      label: "DEFAULT INDICATOR",
      width: 100,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#3b82f6' } }} />
    },
    {
      key: "isSystemIndicator",
      label: "SYSTEM INDICATOR",
      width: 100,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#3b82f6' } }} />
    },
    {
      key: "hasExtraDescription",
      label: "EXTRA DESCRIPTION",
      width: 100,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#3b82f6' } }} />
    },
    { key: "extraDescriptionLable", label: "EXTRA DESCRIPTION LABLE", width: 150 },
    {
      key: "isRequiredField",
      label: "REQUIRED FIELD",
      width: 100,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#3b82f6' } }} />
    },
    {
      key: "isActive",
      label: "ACTIVE",
      width: 80,
      render: (val, row) => (
        <Checkbox
          disabled
          checked={!!val && !row.isDeleted}
          size="small"
          sx={{
            p: 0,
            '&.Mui-checked': { color: '#3b82f6' },
            '&.MuiCheckbox-root': { opacity: (val && !row.isDeleted) ? 1 : 0.5 }
          }}
        />
      )
    },
    {
      key: "actions",
      label: "ACTIONS",
      width: 100,
      render: (val, row) => {
        if (row.isSystemIndicator) return null;
        return (
          <div className="flex items-center">
            <ActionsMenu
              onEdit={row.isActive && !row.isDeleted ? () => {
                setActionItem(row);
                setActionType("edit");
              } : null}
              onAuditLog={() =>
                navigate(`/audit-logs?primaryKey=${row.id}&entityName=${codeDetailsApi.entityName}`)
              }
              onDisable={row.isActive && !row.isDeleted ? () => {
                setActionItem(row);
                setActionType("disable");
              } : null}
              onEnable={!row.isActive || row.isDeleted ? () => {
                setActionItem(row);
                setActionType("enable");
              } : null}
            />
          </div>
        );
      }
    }
  ];

  const breadcrumb = ["Home", "Management", "Lookups", "Code Details"];

  const filterRow = (
    <div className="relative shrink-0">
      <div className="bg-white dark:bg-slate-900 px-2 py-0 flex items-center overflow-x-auto no-scrollbar">
        <div className="flex shrink-0 pr-[95px]">
          {[
            { label: "Code", key: "newCode", w: 70, isCombo: true },
            { label: "Lookup Code", key: "lookupCode", w: 90, isCombo: true },
            { label: "Description", key: "description", w: 165, isCombo: true },
            { label: "Value 1", key: "value1", w: 62, isCombo: true },
            { label: "Value 2", key: "value2", w: 62, isCombo: true },
            { label: "Group Code", key: "groupCode", w: 90, isCombo: true },
            { label: "Group Code Detail", key: "groupCodeDetail", w: 120, isCombo: true },
            { label: "Has Sub Category", key: "hasSubCategory", w: 100, isCombo: false },
            { label: "Sequence", key: "sequence", w: 60, isCombo: true },
            { label: "Default Indicator", key: "isDefaultIndicator", w: 100, isCombo: false },
            { label: "System Indicator", key: "isSystemIndicator", w: 100, isCombo: false },
            { label: "Extra Description", key: "hasExtraDescription", w: 100, isCombo: false },
            { label: "Extra Description Lable", key: "extraDescriptionLable", w: 150, isCombo: true },
            { label: "Required Field", key: "isRequiredField", w: 100, isCombo: false },
            { label: "Active", key: "isActive", w: 80, isCombo: false },
            { label: "Actions", key: "actions", w: 100, isCombo: false },
          ].map((f) => (
            <div key={f.key} style={{ width: f.w }} className="px-1.5 py-2.5 flex flex-col justify-end gap-1.5 shrink-0">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-tight uppercase leading-none min-h-[22px]">
                {f.label.split(' ').map((word, i) => <div key={i}>{word}</div>)}
              </label>
              {f.isCombo ? (
                <input
                  type="text"
                  placeholder={`Search ${f.label.split(' ')[0]}...`}
                  className="h-[30px] w-full bg-slate-50 dark:bg-slate-950 rounded-lg px-2 text-[10px] text-slate-800 dark:text-slate-200 outline-none border border-slate-200 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                  value={filters[f.key] || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              ) : (
                <div className="h-[30px] w-full invisible" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-l border-slate-50 dark:border-white/5 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.05)] z-10">
        <button
          onClick={handleClearAll}
          className="h-[26px] px-5 bg-blue-600 text-white rounded-[6px] text-[9.5px] font-black hover:bg-blue-700 transition-all active:scale-95 shadow-[0_4px_10px_-2px_rgba(37,99,235,0.4)] shrink-0"
        >
          Clear
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[#f1f5f9] dark:bg-black overflow-hidden flex flex-col no-scrollbar px-2 pt-2 pb-1 transition-colors duration-300">
      <nav className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mb-3 ml-1">
        {breadcrumb.map((b, i) => (
          <span key={i} className="flex items-center gap-2">
            <span
              onClick={() => b === "Home" && navigate("/")}
              className={b === "Home" ? "hover:text-blue-500 cursor-pointer transition-colors" : ""}
            >
              {b}
            </span>
            {i < breadcrumb.length - 1 && <span>/</span>}
          </span>
        ))}
      </nav>

      <div className="flex-1 bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all duration-300">
        <div className="px-6 py-3 flex flex-col gap-2 bg-slate-50/50 dark:bg-transparent shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-[28px] font-black text-slate-800 dark:text-white tracking-tighter leading-none uppercase">Code Details</h1>
            {selectedParent && (
              <button
                onClick={() => setModalOpen(true)}
                className="h-[30px] px-8 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-700 transition-all active:scale-95 shadow-sm uppercase shrink-0"
              >
                Add New Code
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1 w-full">
            <label className="text-[9.5px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none px-1">
              Lookup Codes <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="w-full">
              <Autocomplete
                fullWidth
                options={parentCodes}
                loading={loadingParents}
                getOptionLabel={(o) => o.description || ""}
                value={selectedParent}
                inputValue={parentSearch}
                onInputChange={(_, val) => setParentSearch(val)}
                onChange={(_, val) => {
                  setSelectedParent(val);
                  setResetKey(prev => prev + 1);
                }}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <li key={key} {...restProps} className="px-5 py-2.5 border-b border-slate-100 dark:border-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center transition-colors">
                      <span className="text-[13px] font-black text-slate-900 dark:text-slate-100 w-[140px] shrink-0 uppercase">
                        <HighlightText text={option.lookupCode} term={parentSearch} />
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate flex-1 px-6 border-l border-slate-100 dark:border-white/10">
                        <HighlightText text={option.description} term={parentSearch} />
                      </span>
                    </li>
                  );
                }}
                slotProps={{
                  popper: {
                    placement: "bottom-start",
                    modifiers: [
                      { name: "flip", enabled: false },
                      { name: "preventOverflow", enabled: false },
                    ],
                    sx: { zIndex: 1300 }
                  },
                  paper: {
                    sx: {
                      mt: 1,
                      borderRadius: '12px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      '.dark &': {
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      },
                    },
                  },
                }}
                ListboxProps={{
                  sx: {
                    maxHeight: '300px',
                    padding: '4px',
                    '& .MuiAutocomplete-option': {
                      padding: '0 !important',
                      minHeight: 'auto',
                    },
                    '&::-webkit-scrollbar': { display: 'none' },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search code..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        backgroundColor: '#f1f5f9',
                        fontSize: '12px',
                        height: '32px',
                        color: 'inherit',
                        transition: 'all 0.2s',
                        '& fieldset': { border: 'none' },
                        '&:hover': { backgroundColor: '#e2e8f0' },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff',
                          boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.4)',
                          border: '1px solid #2563eb'
                        },
                        '.dark &': {
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                          '&.Mui-focused': {
                            backgroundColor: 'rgba(255,255,255,0.02)',
                          }
                        }
                      },
                      '& .MuiInputBase-input': { fontWeight: '800' }
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col w-full overflow-hidden mt-1">
          {filterRow}
          <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar relative mt-1 min-h-[400px]">
            {selectedParent ? (
              loadingDetails ? (
                <div className="flex items-center justify-center h-full text-slate-300 text-[11px] font-black uppercase tracking-widest">
                  Loading...
                </div>
              ) : codeDetails.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-300 text-[11px] font-black uppercase tracking-widest">
                  No records found
                </div>
              ) : (
                <div className="overflow-auto h-full pr-[140px]">
                  <table className="w-full text-[10px] text-slate-800 dark:text-slate-200 border-collapse">
                    <tbody>
                      {filteredData.map((row, i) => (
                        <tr
                          key={row.id || i}
                          className={`transition-colors
                            ${!row.isActive
                              ? 'bg-slate-50/50 dark:bg-white/5'
                              : 'hover:bg-blue-50/30 dark:hover:bg-blue-500/10'
                            }`}
                        >
                          {columns.map((col) => (
                            <td
                              key={col.key}
                              style={{ width: col.width, minWidth: col.width }}
                              className={`px-2 py-2 transition-opacity ${(!row.isActive && col.key !== 'actions') ? 'opacity-40' : 'opacity-100'}`}
                            >
                              {col.render
                                ? col.render(row[col.key], row)
                                : <HighlightText text={row[col.key]} term={filters[col.key]} />
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#cbd5e1]">Lookup Select Required</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <CodeDetailsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
          selectedParent={selectedParent}
        />
      )}

      {/* Edit Modal */}
      {actionItem && actionType === "edit" && (
        <CodeDetailsModal
          open={true}
          item={actionItem}
          selectedParent={selectedParent}
          onClose={() => { setActionItem(null); setActionType(""); }}
          onSubmit={(payload) => handleUpdate(actionItem.id, payload)}
        />
      )}

      {/* Disable / Enable Confirmation Modal — same pattern as CodePage.jsx */}
      {actionItem && (actionType === "disable" || actionType === "enable") && (
        <DeleteConfirmModal
          open={true}
          item={actionItem}
          loading={actionLoading}
          title={actionType === "disable" ? "Confirm Disable" : "Confirm Enable"}
          confirmText={actionType === "disable" ? "Disable Now" : "Enable Now"}
          onClose={() => { setActionItem(null); setActionType(""); }}
          onConfirm={confirmAction}
        />
      )}

      <style>{`
        body { overflow: hidden !important; }
        .MuiDataGrid-root { border: none !important; width: 100% !important; overflow: hidden !important; }
        .MuiDataGrid-columnHeaders { display: none !important; }
        .MuiDataGrid-cell { border-bottom: none !important; }
        .MuiDataGrid-row { border-bottom: none !important; }
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        ::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .MuiDataGrid-virtualScroller { overflow-x: auto !important; width: 100% !important; }
        .MuiDataGrid-main { border: none !important; }
      `}</style>
    </div>
  );
}