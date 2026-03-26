import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import codeDetailsApi from "../services/api/CodeDetails";
import codesApi from "../services/api/Code";
import { useToast } from "../component/common/ToastContext";
import { Autocomplete, TextField, Checkbox } from "@mui/material";
import CodeDetailsModal from "../component/common/CodeDetailsModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import ResourcePage from "../component/common/ResourcePage";

export default function CodeDetailsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const refetchRef = useRef(null);

  const [parentCodes, setParentCodes] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [loadingParents, setLoadingParents] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filters, setFilters] = useState({
    newCode: "",
    description: "",
    value1: "",
    value2: "",
    groupCode: "",
    groupCodeDetail: "",
    sequence: "",
    extraDescriptionLable: "",
  });

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

  useEffect(() => {
    loadParentCodes();
  }, []);

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

  const handleCreate = async (payload) => {
    try {
      await codeDetailsApi.create({ ...payload, lookupId: selectedParent?.id });
      toast("Code detail created successfully!");
      setModalOpen(false);
      refetchRef.current?.();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      toast(`Failed to create: ${msg}`, "error");
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      await codeDetailsApi.update(id, { ...payload, lookupId: selectedParent?.id });
      toast("Code detail updated successfully!");
      setActionItem(null);
      refetchRef.current?.();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      toast(`Failed to update: ${msg}`, "error");
    }
  };

  const handleDelete = async () => {
    if (!actionItem) return;
    setIsDeleting(true);
    try {
      await codeDetailsApi.delete(actionItem.id);
      toast("Record deleted successfully!");
      setActionItem(null);
      setActionType("");
      refetchRef.current?.();
    } catch (err) {
      toast(`Delete failed: ${err.message}`, "error");
    } finally {
      setIsDeleting(false);
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
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#f472b6' } }} />
    },
    { key: "sequence", label: "SEQUENCE", width: 60 },
    {
      key: "isDefaultIndicator",
      label: "DEFAULT INDICATOR",
      width: 100,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#f472b6' } }} />
    },
    {
      key: "isSystemIndicator",
      label: "SYSTEM INDICATOR",
      width: 100,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#f472b6' } }} />
    },
    {
      key: "hasExtraDescription",
      label: "EXTRA DESCRIPTION",
      width: 100,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#f472b6' } }} />
    },
    { key: "extraDescriptionLable", label: "EXTRA DESCRIPTION LABLE", width: 150 },
    {
      key: "isRequiredField",
      label: "REQUIRED FIELD",
      width: 100,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#f472b6' } }} />
    },
    {
      key: "isActive",
      label: "ACTIVE",
      width: 80,
      render: (val) => <Checkbox disabled checked={!!val} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#f472b6' } }} />
    }
  ];

  const breadcrumb = ["Home", "Management", "Lookups", "Code Details"];

  const filterRow = (
    <div className="bg-white px-1 py-0 border-b border-slate-50 flex items-center overflow-x-auto no-scrollbar">
      <div className="flex shrink-0">
        {[
          { label: "Code", key: "newCode", w: 70, isCombo: true },
          { label: "Lookup Code", key: "lookupCode", w: 90, isCombo: false },
          { label: "Description", key: "description", w: 165, isCombo: true },
          { label: "Value 1", key: "value1", w: 62, isCombo: true },
          { label: "Value 2", key: "value2", w: 62, isCombo: true },
          { label: "Group Code", key: "groupCode", w: 90, isCombo: true },
          { label: "Group Code Detail", key: "groupCodeDetail", w: 120, isCombo: true },
          { label: "Has Sub Category", key: "sub", w: 100, isCombo: false },
          { label: "Sequence", key: "sequence", w: 60, isCombo: true },
          { label: "Default Indicator", key: "def", w: 100, isCombo: false },
          { label: "System Indicator", key: "sys", w: 100, isCombo: false },
          { label: "Extra Description", key: "ext", w: 100, isCombo: false },
          { label: "Extra Description Lable", key: "extraDescriptionLable", w: 150, isCombo: true },
          { label: "Required Field", key: "req", w: 100, isCombo: false },
          { label: "Active", key: "act", w: 80, isCombo: false },
        ].map((f) => (
          <div key={f.key} style={{ width: f.w }} className="px-1.5 py-2.5 flex flex-col justify-end gap-1.5 shrink-0 border-r border-slate-50/50 last:border-r-0">
            <label className="text-[10px] font-black text-[#64748b] tracking-tight uppercase leading-none min-h-[22px]">
              {f.label.split(' ').map((word, i) => <div key={i}>{word}</div>)}
            </label>
            {f.isCombo ? (
              <input
                type="text"
                className="h-[22px] w-full bg-[#f1f5f9] rounded px-1.5 text-[9px] text-slate-800 outline-none border border-slate-200/50"
                value={filters[f.key] || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            ) : (
              <div className="h-[24px] w-full invisible" />
            )}
          </div>
        ))}
        <div className="px-4 flex items-end pb-2.5">
          <button
            onClick={handleClearAll}
            className="h-[22px] px-5 bg-blue-600 text-white rounded text-[8px] font-black hover:bg-blue-700 transition-all active:scale-95 shadow-sm uppercase shrink-0"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[#f1f5f9] overflow-hidden flex flex-col no-scrollbar px-6 pt-4 pb-2">
      {/* PAGE PATH */}
      <nav className="flex items-center gap-2 text-[10px] text-slate-400 mb-3 ml-1">
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

      <div className="flex-1 bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* TOP SECTION: BOXES BOTTOM OF THE TEXT (VERTICAL STACK) */}
        <div className="px-7 py-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-[28px] font-black text-slate-800 tracking-tighter leading-none uppercase">Code Details</h1>
            <button
              onClick={() => setModalOpen(true)}
              className="h-[30px] px-8 bg-blue-600 text-white rounded-lg text-[10px] font-black hover:bg-blue-700 transition-all active:scale-95 shadow-sm uppercase shrink-0"
            >
              Add New Code
            </button>
          </div>

          {/* BOX BOTTOM OF THE TEXT */}
          <div className="flex flex-col gap-2 w-full">
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest leading-none px-1">
              Lookup Codes <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="w-full">
              <Autocomplete
                fullWidth
                options={parentCodes}
                loading={loadingParents}
                getOptionLabel={(o) => o.description || ""}
                value={selectedParent}
                onChange={(_, val) => {
                  setSelectedParent(val);
                  setResetKey(prev => prev + 1);
                }}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <li key={key} {...restProps} className="px-5 py-2.5 border-b border-slate-100 hover:bg-blue-50 flex items-center">
                      <span className="text-[13px] font-black text-slate-900 w-[140px] shrink-0">{option.lookupCode}</span>
                      <span className="text-[11px] text-slate-500 italic truncate flex-1 px-6 border-l border-slate-100">{option.description}</span>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search code..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        backgroundColor: '#f1f5f9',
                        fontSize: '11px',
                        height: '32px',
                        '& fieldset': { border: 'none' },
                      },
                      '& .MuiInputBase-input': { fontWeight: '800' }
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: TABLE */}
        <div className="flex-1 flex flex-col w-full overflow-hidden mt-1">
          {filterRow}
          <div className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar relative mt-1 min-h-[400px]">
            {selectedParent ? (
              <ResourcePage
                key={`${resetKey}-${selectedParent?.id}`}
                title=""
                apiObject={codeDetailsApi}
                columns={columns}
                showSearchBar={false}
                showFilterBar={false}
                showActions={false}
                showPagination={false}
                entityName="CodeDetails"
                initialSortKey="sequence"
                initialSortDir="asc"
                rowHeight={40}
                headerHeight={0}
                containerClassName="flex flex-col h-full w-full"
                hideHeader={true}
                extraParams={{
                  ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== "")),
                  lookupId: selectedParent?.id,
                  code: selectedParent?.lookupCode,
                  loadIsDeleted: true,
                }}
                onRefetchReady={(fn) => {
                  refetchRef.current = fn;
                }}
              />
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

      {modalOpen && (
        <CodeDetailsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
          selectedParent={selectedParent}
        />
      )}

      {actionItem && actionType === "edit" && (
        <CodeDetailsModal
          open={true}
          item={actionItem}
          selectedParent={selectedParent}
          onClose={() => { setActionItem(null); setActionType(""); }}
          onSubmit={(payload) => handleUpdate(actionItem.id, payload)}
        />
      )}

      <DeleteConfirmModal
        open={actionType === "delete"}
        item={actionItem}
        loading={isDeleting}
        onClose={() => { setActionItem(null); setActionType(""); }}
        onConfirm={handleDelete}
      />

      <style>{`
        body { overflow: hidden !important; }
        .MuiDataGrid-root { border: none !important; width: 100% !important; overflow: hidden !important; }
        .MuiDataGrid-columnHeaders { display: none !important; }
        .MuiDataGrid-row { border-bottom: 1px solid #f8fafc !important; }
        .MuiDataGrid-cell { 
          border: none !important; 
          display: flex !important; 
          align-items: center !important; 
          font-size: 10px !important; 
          color: #1e293b !important;
          padding: 0 8px !important;
        }
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