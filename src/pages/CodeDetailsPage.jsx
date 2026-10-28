import { useState, useEffect, useMemo, useCallback } from "react";
import AppSelect from "../component/common/AppSelect";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Loader2,
  Code2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Autocomplete, TextField } from "@mui/material";

import codeDetailsApi from "../services/api/CodeDetails";
import codesApi from "../services/api/Code";
import { useToast } from "../component/common/ToastContext";
import CodeDetailsModal from "../component/common/CodeDetailsModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { ActionsMenu } from "../component/common/ResourcePage";
import { usePermission } from "../hooks/usePermission";
import {
  getCachedApplicationConfig,
  loadApplicationConfig,
} from "../services/applicationConfigCache";
import { getApiErrorMessage } from "../utils/apiError";

const getLocalizationValue = (applicationConfig, key) => {
  const resources = applicationConfig?.localization?.values;
  if (!resources || typeof resources !== "object") return key;

  const defaultResourceName =
    applicationConfig?.localization?.defaultResourceName;
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

// ── Animation variants ────────────────────────────────────────────
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
const ADVANCED_SEARCH_FIELDS = [
  { key: "newCode", localizationKey: "LookupDetailCode" },
  { key: "lookupCode", localizationKey: "Lookup" },
  { key: "description", localizationKey: "Description" },
  { key: "value1", localizationKey: "Value1", compact: true },
  { key: "value2", localizationKey: "Value2", compact: true },
  { key: "groupCode", localizationKey: "GroupCode" },
  { key: "groupCodeDetail", localizationKey: "GroupCodeDetail" },
  { key: "sequence", localizationKey: "Sequence", compact: true },
  { key: "extraDescriptionLable", localizationKey: "ExtraDescriptionLable" },
];

// --- Text Highlighter ---
const HighlightText = ({ text, term }) => {
  if (
    term === null ||
    term === undefined ||
    term === "" ||
    text === null ||
    text === undefined ||
    text === ""
  ) {
    return text ?? "—";
  }
  const str = String(text);
  const normalizedTerm = String(term).toLowerCase();
  const normalizedText = str.toLowerCase();
  const parts = [];
  let cursor = 0;
  let index = normalizedText.indexOf(normalizedTerm, cursor);

  if (index === -1) return str;

  while (index !== -1) {
    if (index > cursor) parts.push(str.slice(cursor, index));
    parts.push(
      <mark
        key={`${index}-${cursor}`}
        className="rounded-sm bg-pink-200 px-0.5 text-pink-900 dark:bg-pink-500/40 dark:text-pink-100"
      >
        {str.slice(index, index + normalizedTerm.length)}
      </mark>,
    );
    cursor = index + normalizedTerm.length;
    index = normalizedText.indexOf(normalizedTerm, cursor);
  }

  if (cursor < str.length) parts.push(str.slice(cursor));

  return (
    <>{parts}</>
  );
};

// ── Skeleton row ──────────────────────────────────────────────────
function SkeletonRow({ delay = 0, columnCount = 1 }) {
  return (
    <Motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className={`border-b border-slate-100 dark:border-slate-800/60 ${ROW_HEIGHT}`}
    >
      {Array.from({ length: columnCount }, (_, index) =>
        [8, 22, 38, 12][index % 4],
      ).map((w, i) => (
        <td key={i} className={`px-5 ${ROW_HEIGHT}`}>
          <div
            className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"
            style={{ width: `${w}%`, minWidth: 20 }}
          />
        </td>
      ))}
    </Motion.tr>
  );
}

export default function CodeDetailsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const canCreate = usePermission("Billing.LookupDetails.Create");
  const canEdit = usePermission("Billing.LookupDetails.Edit");
  const canDelete = usePermission("Billing.LookupDetails.Delete");
  const canViewAuditLog = usePermission("Billing.LookupDetails.ViewAuditLog");
  const [applicationConfig, setApplicationConfig] = useState(
    getCachedApplicationConfig,
  );
  const localize = useCallback(
    (key) => getLocalizationValue(applicationConfig, key),
    [applicationConfig],
  );

  useEffect(() => {
    let isCurrent = true;
    loadApplicationConfig()
      .then((config) => {
        if (isCurrent) setApplicationConfig(config);
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, []);

  const [parentCodes, setParentCodes] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [loadingParents, setLoadingParents] = useState(false);

  const [codeDetails, setCodeDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "asc",
  });

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
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [parentSearch, setParentSearch] = useState("");

  const loadParentCodes = useCallback(async () => {
    setLoadingParents(true);
    try {
      const data = await codesApi.getAll();
      setParentCodes(data);
    } catch (error) {
      toast(
        getApiErrorMessage(error) || localize("DefaultErrorMessage"),
        "error",
      );
    } finally {
      setLoadingParents(false);
    }
  }, [localize, toast]);

  const fetchCodeDetails = useCallback(async () => {
    if (!selectedParent) return;
    setLoadingDetails(true);
    try {
      const data = await codeDetailsApi.getAll({
        lookupId: selectedParent.id,
        lookupCode: selectedParent.lookupCode,
        IsDeleted: true,
      });
      setCodeDetails(data);
    } catch (error) {
      toast(
        getApiErrorMessage(error) || localize("DefaultErrorMessage"),
        "error",
      );
    } finally {
      setLoadingDetails(false);
    }
  }, [localize, selectedParent, toast]);

  useEffect(() => {
    loadParentCodes();
  }, [loadParentCodes]);
  useEffect(() => {
    fetchCodeDetails();
  }, [fetchCodeDetails]);

  const clearSearchFilters = () => {
    setFilters((current) =>
      Object.fromEntries(Object.keys(current).map((key) => [key, ""])),
    );
  };

  const hasAdvancedFilters = Object.values(filters).some(Boolean);
  const advancedSearchOptions = useMemo(
    () =>
      Object.fromEntries(
        ADVANCED_SEARCH_FIELDS.map(({ key }) => [
          key,
          [...new Set(
            codeDetails
              .map((record) => record[key])
              .filter((value) => value !== null && value !== undefined && value !== "")
              .map(String),
          )].sort((left, right) => left.localeCompare(right)),
        ]),
      ),
    [codeDetails],
  );

  // --- Real-time Local Filtering ---
  const filteredData = useMemo(() => {
    return codeDetails.filter((row) => {
      return Object.keys(filters).every((key) => {
        const term = filters[key];
        if (!term) return true;
        const cellVal = String(row[key] ?? "");
        return cellVal.toLowerCase().includes(term.toLowerCase());
      });
    });
  }, [codeDetails, filters]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    const getSortValue = (row) => {
      if (sortConfig.key === "isActive") {
        return Boolean(row.isActive && !row.isDeleted);
      }
      return row[sortConfig.key];
    };

    return filteredData
      .map((row, index) => ({ row, index }))
      .sort((leftItem, rightItem) => {
        const left = getSortValue(leftItem.row);
        const right = getSortValue(rightItem.row);

        if (left == null && right == null) return leftItem.index - rightItem.index;
        if (left == null) return 1;
        if (right == null) return -1;

        let comparison;
        if (typeof left === "number" && typeof right === "number") {
          comparison = left - right;
        } else if (typeof left === "boolean" && typeof right === "boolean") {
          comparison = Number(left) - Number(right);
        } else {
          comparison = String(left).localeCompare(String(right), undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }

        if (comparison === 0) return leftItem.index - rightItem.index;
        return sortConfig.direction === "asc" ? comparison : -comparison;
      })
      .map(({ row }) => row);
  }, [filteredData, sortConfig]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleCreate = async (payload) => {
    const finalPayload = {
      ...payload,
      lookupId: selectedParent?.id,
      lookupCode: selectedParent?.lookupCode,
    };
    await codeDetailsApi.create(finalPayload);
    toast(localize("SavedSuccessfully"));
    setModalOpen(false);
    await fetchCodeDetails();
  };

  const handleUpdate = async (id, payload) => {
    await codeDetailsApi.update(id, {
      ...payload,
      lookupId: selectedParent?.id,
    });
    toast(localize("SavedSuccessfully"));
    setActionItem(null);
    setActionType("");
    await fetchCodeDetails();
  };

  // ── Confirm disable/enable (same pattern as CodePage.jsx) ──────────────────
  const confirmAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      if (actionType === "disable") {
        await codeDetailsApi.disable(actionItem.id);
        toast(localize("SavedSuccessfully"));
      } else if (actionType === "enable") {
        await codeDetailsApi.enable(actionItem.id);
        toast(localize("SavedSuccessfully"));
      }
      await fetchCodeDetails();
    } catch (err) {
      toast(
        getApiErrorMessage(err) || localize("DefaultErrorMessage"),
        "error",
      );
    } finally {
      setActionLoading(false);
      setActionItem(null);
      setActionType("");
    }
  };

  const columns = [
    {
      key: "newCode",
      label: localize("LookupDetailCode"),
      width: 80,
      render: (val) => (
        <span className="text-[12px] font-semibold text-black dark:text-white tracking-tight leading-none">
          <HighlightText text={val} term={filters.newCode} />
        </span>
      ),
    },
    {
      key: "lookupCode",
      label: localize("Lookup"),
      width: 100,
      render: (val) => (
        <span className="text-[12px] font-semibold text-black dark:text-white tracking-tight leading-none">
          <HighlightText text={val} term={filters.lookupCode} />
        </span>
      ),
    },
    {
      key: "description",
      label: localize("Description"),
      width: 220,
      render: (val) => (
        <span className="text-[12px] text-black dark:text-white leading-none line-clamp-1">
          {val ? (
            <HighlightText text={val} term={filters.description} />
          ) : (
            <span className="italic text-black dark:text-white">—</span>
          )}
        </span>
      ),
    },
    {
      key: "value1",
      label: localize("Value1"),
      width: 80,
      render: (val) => (
        <span className="text-[11px] font-medium text-black dark:text-white">
          <HighlightText text={val} term={filters.value1} />
        </span>
      ),
    },
    {
      key: "value2",
      label: localize("Value2"),
      width: 80,
      render: (val) => (
        <span className="text-[11px] font-medium text-black dark:text-white">
          <HighlightText text={val} term={filters.value2} />
        </span>
      ),
    },
    {
      key: "groupCode",
      label: localize("GroupCode"),
      width: 100,
      render: (val) => (
        <span className="text-[11px] font-medium text-black dark:text-white">
          <HighlightText text={val} term={filters.groupCode} />
        </span>
      ),
    },
    {
      key: "groupCodeDetail",
      label: localize("GroupCodeDetail"),
      width: 140,
      render: (val) => (
        <span className="text-[11px] font-medium text-black dark:text-white">
          <HighlightText text={val} term={filters.groupCodeDetail} />
        </span>
      ),
    },
    {
      key: "hasSubCategory",
      label: localize("HasSubCategory"),
      width: 50,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black ${val ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-black dark:text-white"}`}
        >
          {val ? "✓" : "–"}
        </span>
      ),
    },
    {
      key: "sequence",
      label: localize("Sequence"),
      width: 50,
      align: "center",
      render: (val) => (
        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-slate-100/50 dark:bg-slate-800/80 text-black dark:text-white font-mono text-[11px] font-medium">
          <HighlightText text={val} term={filters.sequence} />
        </span>
      ),
    },
    {
      key: "isDefaultIndicator",
      label: localize("IsDefaultIndicator"),
      width: 50,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black ${val ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-black dark:text-white"}`}
        >
          {val ? "✓" : "–"}
        </span>
      ),
    },
    {
      key: "isSystemIndicator",
      label: localize("IsSystemIndicator"),
      width: 120,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black ${val ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-black dark:text-white"}`}
        >
          {val ? "✓" : "–"}
        </span>
      ),
    },
    {
      key: "hasExtraDescription",
      label: localize("HasExtraDescription"),
      width: 50,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black ${val ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-black dark:text-white"}`}
        >
          {val ? "✓" : "–"}
        </span>
      ),
    },
    {
      key: "extraDescriptionLable",
      label: localize("ExtraDescriptionLable"),
      width: 120,
      render: (val) => (
        <span className="text-[11px] text-black dark:text-white italic line-clamp-1">
          <HighlightText text={val} term={filters.extraDescriptionLable} />
        </span>
      ),
    },
    {
      key: "isRequiredField",
      label: localize("IsRequiredField"),
      width: 50,
      align: "center",
      render: (val) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black ${val ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-black dark:text-white"}`}
        >
          {val ? "✓" : "–"}
        </span>
      ),
    },
    {
      key: "isActive",
      label: localize("IsActive"),
      width: 100,
      align: "center",
      render: (val, row) => (
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black ${val && !row.isDeleted ? "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400" : "bg-slate-100/50 dark:bg-slate-800/80 text-black dark:text-white"}`}
        >
          {val && !row.isDeleted ? "✓" : "–"}
        </span>
      ),
    },
    {
      key: "actions",
      label: localize("Actions"),
      width: 100,
      align: "right",
      sortable: false,
      render: (val, row) => {
        // System-indicator records are backend-controlled reference data.
        // They must remain visible, but no row actions may be exposed.
        if (row.isSystemIndicator) return null;

        return (
          <div className="flex justify-end items-center h-full">
            <ActionsMenu
              onEdit={
                canEdit && row.isActive && !row.isDeleted
                  ? () => {
                    setActionItem(row);
                    setActionType("edit");
                  }
                  : undefined
              }
              onAuditLog={canViewAuditLog ? () =>
                navigate(
                  `/audit-logs?primaryKey=${encodeURIComponent(row.id)}&entityName=${encodeURIComponent(codeDetailsApi.entityName)}`,
                )
              : undefined}
              onDisable={
                canDelete && row.isActive && !row.isDeleted
                  ? () => {
                    setActionItem(row);
                    setActionType("disable");
                  }
                  : undefined
              }
              onEnable={
                canDelete && (!row.isActive || row.isDeleted)
                  ? () => {
                    setActionItem(row);
                    setActionType("enable");
                  }
                  : undefined
              }
              actionButtonText={localize("Actions")}
              editButtonText={localize("Edit")}
              auditLogButtonText={localize("AuditLogsButtonText")}
              disableButtonText={localize("DisableButtonText")}
              enableButtonText={localize("EnableButtonText")}
            />
          </div>
        );
      },
    },
  ];

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]"
    >

      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        td, tr { overflow: visible !important; }

        .custom-scrollbar::-webkit-scrollbar:horizontal { height: 8px; display: block !important; }
        .custom-scrollbar::-webkit-scrollbar:vertical { display: none !important; width: 0 !important; }
        .custom-scrollbar { scrollbar-width: thin !important; }
        .custom-scrollbar::-webkit-scrollbar-track:horizontal { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #475569; }
      `}</style>

      {/* ── Unified Full-Screen Card ── */}
      <Motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col relative rounded-3xl overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="app-page-header flex flex-col gap-6 py-6 px-4 md:px-8 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
                  <span>{localize("Home")}</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span>{localize("Lookups")}</span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-pink-500">
                    {localize("LookupDetails")}
                  </span>
                </nav>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tighter">
                  {localize("LookupDetails")}
                  <AnimatePresence>
                    {(loadingParents || loadingDetails || actionLoading) && (
                      <Motion.span
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Loader2
                          size={15}
                          className="animate-spin text-indigo-400"
                        />
                      </Motion.span>
                    )}
                  </AnimatePresence>
                </h1>
              </div>
            </div>

            {selectedParent && canCreate && (
              <Motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setModalOpen(true)}
                className="app-primary-button inline-flex items-center px-5 py-2.5 text-xs uppercase tracking-tight"
              >
                {localize("AddNewLookupDetail")}
              </Motion.button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col xl:flex-row xl:items-end gap-3">
              {/* Parent Selection */}
              <div className="w-full max-w-2xl xl:flex-1">
                <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none px-1">
                {localize("LookupCode")} <span className="required-asterisk">*</span>
              </label>
              <Autocomplete
                fullWidth
                options={parentCodes}
                loading={loadingParents}
                getOptionLabel={(o) => o.description || ""}
                filterOptions={(options, state) => {
                  const searchValue = state.inputValue.trim().toLowerCase();
                  if (!searchValue) return options;
                  return options.filter((option) =>
                    `${option.lookupCode ?? ""} ${option.description ?? ""}`
                      .toLowerCase()
                      .includes(searchValue),
                  );
                }}
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
                    placeholder={localize("SearchCode")}
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

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAdvancedSearch((visible) => !visible)}
                className={`h-[42px] inline-flex items-center justify-center gap-2 px-4 rounded-xl border text-xs font-bold transition-all ${showAdvancedSearch ? "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-500/10 dark:border-pink-500/30 dark:text-pink-400" : "bg-white text-slate-500 border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-800/50 dark:text-slate-400 hover:text-pink-600"}`}
                aria-expanded={showAdvancedSearch}
              >
                <Filter size={14} />
                {localize("AdvancedSearch")}
                {hasAdvancedFilters && (
                  <span className="h-2 w-2 rounded-full bg-pink-500" />
                )}
              </button>
              <button
                type="button"
                onClick={clearSearchFilters}
                className="app-primary-button h-[42px] inline-flex items-center justify-center gap-2 px-4 text-xs"
              >
                {localize("ClearFilter")}
              </button>
            </div>
            </div>

            <AnimatePresence initial={false}>
              {showAdvancedSearch && (
                <Motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-nowrap w-full gap-1.5 pt-3 pb-1 border-t border-slate-100 dark:border-slate-800/50 overflow-hidden">
                    {ADVANCED_SEARCH_FIELDS.map(({ key, localizationKey, compact }) => (
                      <div
                        key={key}
                        className="basis-0 min-w-0"
                        style={{ flexGrow: compact ? 0.55 : 1 }}
                      >
                        <Autocomplete
                          freeSolo
                          forcePopupIcon={false}
                          options={advancedSearchOptions[key] || []}
                          value={filters[key] || null}
                          inputValue={filters[key] || ""}
                          onChange={(_, value) =>
                            setFilters((current) => ({
                              ...current,
                              [key]: value === null ? "" : String(value),
                            }))
                          }
                          onInputChange={(_, value) =>
                            setFilters((current) => ({ ...current, [key]: value }))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder={localize(localizationKey)}
                              size="small"
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  minHeight: "34px",
                                  paddingRight: "6px !important",
                                  borderRadius: "9px",
                                  backgroundColor: "rgba(248, 250, 252, 0.8)",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  ".dark &": {
                                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                                  },
                                  "&.Mui-focused fieldset": {
                                    borderColor: "#ec4899",
                                  },
                                },
                                "& .MuiAutocomplete-input": {
                                  minWidth: "0 !important",
                                  padding: "5px 4px !important",
                                  textOverflow: "ellipsis",
                                },
                                "& .MuiAutocomplete-clearIndicator": {
                                  padding: "2px",
                                },
                              }}
                            />
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Table Area ── */}
        <div className="w-full flex flex-col">
          <div className="w-full overflow-x-auto custom-scrollbar px-4 pb-4">
            <div className="min-w-max">
              <table className="w-full min-w-[900px] text-left border-separate border-spacing-y-0">
                <thead>
                  <tr
                    className={`bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 ${ROW_HEIGHT}`}
                  >
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        style={{ width: col.width }}
                        aria-sort={
                          col.sortable === false || sortConfig.key !== col.key
                            ? "none"
                            : sortConfig.direction === "asc"
                              ? "ascending"
                              : "descending"
                        }
                        className={`px-3 ${ROW_HEIGHT} text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-${col.align || "left"}`}
                      >
                        {col.sortable === false ? (
                          col.label
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSort(col.key)}
                            aria-label={col.label}
                            className={`w-full inline-flex items-center gap-1.5 hover:text-pink-600 dark:hover:text-pink-400 transition-colors ${col.align === "center" ? "justify-center" : col.align === "right" ? "justify-end" : "justify-start"}`}
                          >
                            <span>{col.label}</span>
                            {sortConfig.key === col.key ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp size={12} className="shrink-0 text-pink-600 dark:text-pink-400" />
                              ) : (
                                <ArrowDown size={12} className="shrink-0 text-pink-600 dark:text-pink-400" />
                              )
                            ) : (
                              <ArrowUpDown size={11} className="shrink-0 opacity-50" />
                            )}
                          </button>
                        )}
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
                        <Motion.div
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
                          <p className="text-[11px] text-slate-400 dark:text-slate-600 uppercase font-black tracking-widest">
                            {localize("SelectBoxEmptyValueText")}
                          </p>
                        </Motion.div>
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
                          <Motion.div
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
                            <p className="text-[11px] text-slate-400 dark:text-slate-600">
                              {localize("NoDataAvailableInDatatable")}
                            </p>
                          </Motion.div>
                        </td>
                      </tr>
                    )
                  )}

                  {/* Data rows */}
                  {selectedParent && !loadingDetails && paginatedItems.length > 0 && (
                    <AnimatePresence>
                      {paginatedItems.map((row, idx) => {
                        const rowBgClass =
                          idx % 2 === 0
                            ? "bg-white dark:bg-[#161920]/40"
                            : "bg-gray-200/50 dark:bg-white/[0.03]";

                        return (
                          <Motion.tr
                            key={row.id}
                            layout
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`group transition-all duration-200 ${ROW_HEIGHT} relative z-0 hover:z-10 ${rowBgClass}`}
                          >
                            {columns.map((col, colIdx) => (
                              <td
                                key={col.key}
                                className={`px-3 ${ROW_HEIGHT} ${rowBgClass} ${colIdx === 0 ? "rounded-l-2xl" : ""} ${colIdx === columns.length - 1 ? "rounded-r-2xl" : ""} transition-colors`}
                              >
                                <div
                                  className={`text-[11px] font-medium text-black dark:text-white leading-none text-${col.align || "left"}`}
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
                          </Motion.tr>
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
                    {localize("PagerShowMenuEntries").split("_MENU_")[0]}
                  </span>
                  <AppSelect
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
                    </AppSelect>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {localize("PagerShowMenuEntries").split("_MENU_")[1]}
                    </span>
                </div>

                <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {localize("PagerInfo{0}{1}{2}")
                      .replace(
                        "{0}",
                        filteredData.length === 0
                          ? "0"
                          : String((currentPage - 1) * pageSize + 1),
                      )
                      .replace(
                        "{1}",
                        String(Math.min(currentPage * pageSize, filteredData.length)),
                      )
                      .replace("{2}", String(filteredData.length))}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
                <button
                  aria-label={localize("PagerFirst")}
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronsLeft size={16} strokeWidth={2.5} />
                </button>
                <button
                  aria-label={localize("PagerPrevious")}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1" />

                <div className="px-3 flex items-center gap-2">
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
                  aria-label={localize("PagerNext")}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
                <button
                  aria-label={localize("PagerLast")}
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
      </Motion.div>

      {/* Create Modal */}
      {modalOpen && (
        <CodeDetailsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
          selectedParent={selectedParent}
          localize={localize}
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
          localize={localize}
        />
      )}

      {/* Disable / Enable Confirmation Modal — same pattern as CodePage.jsx */}
      {actionItem && (actionType === "disable" || actionType === "enable") && (
        <DeleteConfirmModal
          open={true}
          item={actionItem}
          loading={actionLoading}
          blurBackdrop={false}
          title={
            actionType === "disable"
              ? localize("DisableButtonText")
              : localize("EnableButtonText")
          }
          message={
            actionType === "disable"
              ? localize("DisableConfirmationMessage")
              : localize("EnableConfirmationMessage")
          }
          confirmText={
            actionType === "disable"
              ? localize("DisableButtonText")
              : localize("EnableButtonText")
          }
          cancelText={localize("Cancel")}
          processingText={localize("ProcessingWithThreeDot")}
          onClose={() => {
            setActionItem(null);
            setActionType("");
          }}
          onConfirm={confirmAction}
        />
      )}
    </Motion.div>
  );
}
