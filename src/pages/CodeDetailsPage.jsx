import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Plus,
  Loader2,
  Code2,
  X,
  GripVertical,
} from "lucide-react";
import { Autocomplete, TextField, Checkbox } from "@mui/material";

import codeDetailsApi from "../services/api/CodeDetails";
import codesApi from "../services/api/Code";
import { useToast } from "../component/common/ToastContext";
import CodeDetailsModal from "../component/common/CodeDetailsModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { ActionsMenu } from "../component/common/ResourcePage";

// ── Animation variants ────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.015 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const ROW_HEIGHT = "h-[56px]";

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

// ── Skeleton row ──────────────────────────────────────────────────
function SkeletonRow({ delay = 0 }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className={`border-b border-slate-100 dark:border-slate-800/60 ${ROW_HEIGHT}`}
    >
      {[8, 22, 38, 8, 8, 12, 8].map((w, i) => (
        <td key={i} className={`px-5 ${ROW_HEIGHT}`}>
          <div
            className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"
            style={{ width: `${w}%`, minWidth: 20 }}
          />
        </td>
      ))}
    </motion.tr>
  );
}

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  useEffect(() => {
    loadParentCodes();
  }, []);
  useEffect(() => {
    fetchCodeDetails();
  }, [selectedParent, filters]);

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
    setResetKey((prev) => prev + 1);
  };

  // --- Real-time Local Filtering ---
  const filteredData = useMemo(() => {
    return codeDetails.filter((row) => {
      return Object.keys(filters).every((key) => {
        const term = filters[key];
        if (!term) return true;
        const cellVal = String(row[key] || "");
        return cellVal.toLowerCase().includes(term.toLowerCase());
      });
    });
  }, [codeDetails, filters]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleCreate = async (payload) => {
    try {
      const finalPayload = {
        ...payload,
        lookupId: selectedParent?.id,
        lookupCode: selectedParent?.lookupCode,
      };
      await codeDetailsApi.create(finalPayload);
      toast("Code detail created !successfully");
      setModalOpen(false);
      fetchCodeDetails();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      await codeDetailsApi.update(id, {
        ...payload,
        lookupId: selectedParent?.id,
      });
      toast("Code detail updated !successfully");
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
        toast("Record disabled !successfully");
      } else if (actionType === "enable") {
        await codeDetailsApi.enable(actionItem.id);
        toast("Record enabled !successfully");
      }
      fetchCodeDetails();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        "An error occurred.";
      toast(`Failed to ${actionType} record: ${msg}`, "error");
    } finally {
      setActionLoading(false);
      setActionItem(null);
      setActionType("");
    }
  };

  const columns = [
    {
      key: "newCode",
      label: "CODE",
      width: 80,
      render: (val) => (
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
          <HighlightText text={val} term={filters.newCode} />
        </span>
      ),
    },
    {
      key: "lookupCode",
      label: "LOOKUP",
      width: 100,
      render: (val) => (
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
          <HighlightText text={val} term={filters.lookupCode} />
        </span>
      ),
    },
    {
      key: "description",
      label: "DESCRIPTION",
      width: 220,
      render: (val) => (
        <span className="text-sm text-slate-500 dark:text-slate-400 leading-none line-clamp-1">
          {val ? (
            <HighlightText text={val} term={filters.description} />
          ) : (
            <span className="italic text-slate-300 dark:text-slate-700">
              No description
            </span>
          )}
        </span>
      ),
    },
    {
      key: "groupCode",
      label: "GROUP",
      width: 100,
      render: (val) => (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          <HighlightText text={val} term={filters.groupCode} />
        </span>
      ),
    },
    {
      key: "groupCodeDetail",
      label: "DETAIL",
      width: 140,
      render: (val) => (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          <HighlightText text={val} term={filters.groupCodeDetail} />
        </span>
      ),
    },
    {
      key: "hasSubCategory",
      label: "SUB",
      width: 50,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${val ? "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-slate-300 dark:text-slate-700"}`}
        >
          {val ? "✓" : "–"}
        </span>
      ),
    },
    {
      key: "sequence",
      label: "SEQ",
      width: 50,
      align: "center",
      render: (val) => (
        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-slate-100/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-mono text-xs font-medium">
          {val}
        </span>
      ),
    },
    {
      key: "isDefaultIndicator",
      label: "DEF",
      width: 50,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${val ? "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-slate-300 dark:text-slate-700"}`}
        >
          {val ? "★" : "–"}
        </span>
      ),
    },
    {
      key: "isSystemIndicator",
      label: "SYS",
      width: 50,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${val ? "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-slate-300 dark:text-slate-700"}`}
        >
          {val ? "⚙" : "–"}
        </span>
      ),
    },
    {
      key: "hasExtraDescription",
      label: "EXT",
      width: 50,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${val ? "bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-slate-300 dark:text-slate-700"}`}
        >
          {val ? "⊕" : "–"}
        </span>
      ),
    },
    {
      key: "extraDescriptionLable",
      label: "EXT LABEL",
      width: 120,
      render: (val) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1">
          <HighlightText text={val} term={filters.extraDescriptionLable} />
        </span>
      ),
    },
    {
      key: "isRequiredField",
      label: "REQ",
      width: 50,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${val ? "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-slate-300 dark:text-slate-700"}`}
        >
          {val ? "!" : "–"}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "STATUS",
      width: 100,
      align: "center",
      render: (val, row) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${val && !row.isDeleted ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500"}`}
        >
          <span
            className={`w-1 h-1 rounded-full ${val && !row.isDeleted ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"}`}
          />
          {val && !row.isDeleted ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      width: 100,
      align: "right",
      render: (val, row) => {
        if (row.isSystemIndicator) return null;
        return (
          <div className="flex justify-end items-center h-full">
            <ActionsMenu
              onEdit={
                row.isActive && !row.isDeleted
                  ? () => {
                      setActionItem(row);
                      setActionType("edit");
                    }
                  : null
              }
              onAuditLog={() =>
                navigate(
                  `/audit-logs?primaryKey=${row.id}&entityName=${codeDetailsApi.entityName}`,
                )
              }
              onDisable={
                row.isActive && !row.isDeleted
                  ? () => {
                      setActionItem(row);
                      setActionType("disable");
                    }
                  : null
              }
              onEnable={
                !row.isActive || row.isDeleted
                  ? () => {
                      setActionItem(row);
                      setActionType("enable");
                    }
                  : null
              }
              className="border border-pink-500 text-pink-500 bg-transparent hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded-xl px-4 py-1.5 text-[11px] font-bold flex items-center transition-all"
            />
          </div>
        );
      },
    },
  ];

  const breadcrumb = ["Home", "Management", "Lookups", "Code Details"];

  const filterRow = (
    <div className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60 transition-all overflow-x-auto no-scrollbar">
      <div className="flex px-4 min-w-max relative group">
        {[
          { label: "Code", key: "newCode", w: 80, isCombo: true },
          { label: "Lookup", key: "lookupCode", w: 100, isCombo: true },
          { label: "Description", key: "description", w: 220, isCombo: true },
          { label: "Group", key: "groupCode", w: 100, isCombo: true },
          { label: "Detail", key: "groupCodeDetail", w: 140, isCombo: true },
          { label: "Sub", key: "hasSubCategory", w: 50, isCombo: false },
          { label: "Seq", key: "sequence", w: 50, isCombo: true },
          { label: "Def", key: "isDefaultIndicator", w: 50, isCombo: false },
          { label: "Sys", key: "isSystemIndicator", w: 50, isCombo: false },
          { label: "Ext", key: "hasExtraDescription", w: 50, isCombo: false },
          {
            label: "Extra Label",
            key: "extraDescriptionLable",
            w: 120,
            isCombo: true,
          },
          { label: "Req", key: "isRequiredField", w: 50, isCombo: false },
          { label: "Status", key: "isActive", w: 100, isCombo: false },
          { label: "Actions", key: "actions", w: 100, isCombo: false },
        ].map((f, i) => (
          <div
            key={f.key}
            style={{ width: f.w }}
            className={`px-2 py-3 flex flex-col gap-1.5 shrink-0 ${i === 0 ? "pl-4" : ""}`}
          >
            {f.isCombo ? (
              <div className="relative group/input">
                <input
                  type="text"
                  placeholder={f.label}
                  className="w-full pl-3 pr-8 py-2 text-[11px] font-medium bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 transition-all placeholder:text-slate-400/70"
                  value={filters[f.key] || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                />
                {filters[f.key] && (
                  <button
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, [f.key]: "" }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-pink-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ) : (
              <div className="h-[30px]" />
            )}
          </div>
        ))}
        {/* Absolute Clear Button */}
        <div className="sticky right-0 flex items-center pl-4 pr-2 bg-gradient-to-l from-slate-50 dark:from-[#161920] via-slate-50 dark:via-[#161920] to-transparent">
          <button
            onClick={handleClearAll}
            className="h-8 px-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 hover:text-pink-600 hover:border-pink-500 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <X size={12} /> Clear Filters
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-full bg-transparent p-0 pb-12 relative overflow-visible"
    >

      <style>{`
        *::-webkit-scrollbar {
          display: none !important;
        }
        * {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* ── Unified Full-Screen Card ── */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full bg-white dark:bg-[#161920] shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col relative rounded-3xl overflow-hidden mb-8"
      >
        {/* ── Header ── */}
        <div className="flex flex-col gap-6 py-6 px-4 md:px-8 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 hover:text-pink-600 transition-all border border-slate-200/60 dark:border-slate-700/50 shadow-sm"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </motion.button>
              <div>
                <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
                  <span>Home</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span>Management</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span>Lookups</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-indigo-400 dark:text-indigo-500">
                    Code Details
                  </span>
                </nav>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tighter">
                  Code Details
                  <AnimatePresence>
                    {(loadingParents || loadingDetails || actionLoading) && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Loader2
                          size={15}
                          className="animate-spin text-indigo-400"
                        />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </h1>
              </div>
            </div>

            {selectedParent && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white uppercase tracking-tight"
              >
                New Code Detail
              </motion.button>
            )}
          </div>

          {/* Parent Selection */}
          <div className="w-full max-w-2xl">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none px-1">
                Select Lookup Code <span className="text-pink-500">*</span>
              </label>
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
                  setCurrentPage(1);
                }}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <li
                      key={key}
                      {...restProps}
                      className="px-5 py-3 hover:bg-pink-50 dark:hover:bg-pink-500/10 flex items-center transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                          <HighlightText
                            text={option.lookupCode}
                            term={parentSearch}
                          />
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                          <HighlightText
                            text={option.description}
                            term={parentSearch}
                          />
                        </span>
                      </div>
                    </li>
                  );
                }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1,
                      borderRadius: "16px",
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                      border: "1px solid rgba(226, 232, 240, 0.6)",
                      "& .MuiAutocomplete-listbox": { padding: "8px" },
                    },
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search parent code..."
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "14px",
                        backgroundColor: "rgba(248, 250, 252, 0.8)",
                        fontSize: "13px",
                        height: "44px",
                        transition: "all 0.2s",
                        "& fieldset": {
                          borderColor: "rgba(226, 232, 240, 0.6)",
                        },
                        "&:hover fieldset": {
                          borderColor: "rgba(236, 72, 153, 0.3)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#ec4899",
                          borderWidth: "2px",
                        },
                        ".dark &": {
                          backgroundColor: "rgba(30, 41, 59, 0.5)",
                          "& fieldset": {
                            borderColor: "rgba(51, 65, 85, 0.5)",
                          },
                        },
                      },
                      "& .MuiInputBase-input": {
                        fontWeight: "700",
                        paddingLeft: "8px !important",
                      },
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* ── Table Area ── */}
        <div className="w-full flex flex-col">
          {filterRow}

          <div className="w-full overflow-x-auto no-scrollbar px-4 pb-4">
            <div className="min-w-max">
              <table className="w-full text-left border-separate border-spacing-y-0">
                <thead>
                  <tr
                    className={`bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 ${ROW_HEIGHT}`}
                  >
                    {columns.map((col, i) => (
                      <th
                        key={col.key}
                        style={{ width: col.width }}
                        className={`px-5 ${ROW_HEIGHT} text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-${col.align || "left"} ${i === 0 ? "pl-8" : ""}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-transparent">
                  {/* Skeleton */}
                  {loadingDetails &&
                    paginatedItems.length === 0 &&
                    [0, 0.05, 0.1, 0.15, 0.2].map((d, i) => (
                      <SkeletonRow
                        key={i}
                        delay={d}
                        columnCount={columns.length}
                      />
                    ))}

                  {/* Empty state */}
                  {!selectedParent ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="py-24 text-center"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col items-center gap-3"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Search
                              size={20}
                              className="text-slate-300 dark:text-slate-600"
                            />
                          </div>
                          <p className="text-sm text-slate-400 dark:text-slate-600 uppercase font-black tracking-widest">
                            Please select a lookup code first
                          </p>
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    !loadingDetails &&
                    filteredData.length === 0 && (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="py-24 text-center"
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-3"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Code2
                                size={20}
                                className="text-slate-300 dark:text-slate-600"
                              />
                            </div>
                            <p className="text-sm text-slate-400 dark:text-slate-600">
                              No records found for the selected criteria.
                            </p>
                          </motion.div>
                        </td>
                      </tr>
                    )
                  )}

                  {/* Data rows */}
                  {!loadingDetails && paginatedItems.length > 0 && (
                    <AnimatePresence>
                      {paginatedItems.map((row, idx) => {
                        const rowBgClass =
                          idx % 2 === 0
                            ? "bg-white dark:bg-[#161920]/40"
                            : "bg-gray-200/50 dark:bg-white/[0.03]";

                        return (
                          <motion.tr
                            key={row.id}
                            layout
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            whileHover={{
                              y: -3,
                              backgroundColor: "rgba(236, 72, 153, 0.02)",
                              transition: { duration: 0.1 },
                            }}
                            style={{
                              backfaceVisibility: "hidden",
                              transform: "translateZ(0)",
                            }}
                            className={`group transition-all duration-200 ${ROW_HEIGHT} relative z-0 hover:z-10`}
                          >
                            {columns.map((col, colIdx) => (
                              <td
                                key={col.key}
                                className={`px-5 ${ROW_HEIGHT} ${rowBgClass} ${colIdx === 0 ? "pl-8 rounded-l-2xl" : ""} ${colIdx === columns.length - 1 ? "rounded-r-2xl" : ""} transition-colors`}
                              >
                                <div
                                  className={`text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-none text-${col.align || "left"}`}
                                >
                                  {col.render ? (
                                    col.render(row[col.key], row)
                                  ) : (
                                    <HighlightText
                                      text={row[col.key]}
                                      term={filters[col.key]}
                                    />
                                  )}
                                </div>
                              </td>
                            ))}
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer & Pagination */}
        <AnimatePresence>
          {selectedParent && filteredData.length > 0 && (
            <div className="w-full px-6 py-4 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors shrink-0">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Page Size:
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 h-7 text-[10px] font-black bg-slate-50 dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none cursor-pointer hover:border-pink-500/50 uppercase tracking-widest"
                  >
                    {[10, 25, 50, 100].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <span className="text-slate-900 dark:text-white">
                      {filteredData.length === 0
                        ? 0
                        : (currentPage - 1) * pageSize + 1}
                    </span>
                    <span className="mx-1.5 text-slate-400">—</span>
                    <span className="text-slate-900 dark:text-white">
                      {Math.min(currentPage * pageSize, filteredData.length)}
                    </span>
                    <span className="mx-2 lowercase font-bold italic tracking-normal">
                      of
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {filteredData.length}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronsLeft size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

                <div className="px-3 flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Page
                  </span>
                  <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                    <span className="text-[12px] font-black text-pink-600 leading-none">
                      {currentPage}
                    </span>
                    <span className="text-[10px] font-black text-slate-300">
                      /
                    </span>
                    <span className="text-[10px] font-black text-slate-500 leading-none">
                      {totalPages || 1}
                    </span>
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronsRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

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
          onClose={() => {
            setActionItem(null);
            setActionType("");
          }}
          onSubmit={(payload) => handleUpdate(actionItem.id, payload)}
        />
      )}

      {/* Disable / Enable Confirmation Modal — same pattern as CodePage.jsx */}
      {actionItem && (actionType === "disable" || actionType === "enable") && (
        <DeleteConfirmModal
          open={true}
          item={actionItem}
          loading={actionLoading}
          title={
            actionType === "disable" ? "Confirm Disable" : "Confirm Enable"
          }
          confirmText={actionType === "disable" ? "Disable Now" : "Enable Now"}
          onClose={() => {
            setActionItem(null);
            setActionType("");
          }}
          onConfirm={confirmAction}
        />
      )}
    </motion.div>
  );
}
