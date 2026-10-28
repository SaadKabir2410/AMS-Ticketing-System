import { useState, useEffect, useCallback, useMemo } from "react";
import AppSelect from "../component/common/AppSelect";
import { useNavigate } from "react-router-dom";
import { workCodesApi } from "../services/api/workCodes";
import { useToast } from "../component/common/ToastContext";
import { ActionsMenu } from "../component/common/ResourcePage";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, X, Filter } from "lucide-react";
import WorkCodeModal from "../component/common/WorkCodeModal";
import { usePermission } from "../hooks/usePermission";
import { getApiErrorMessage } from "../utils/apiError";
import ListPager from "../component/common/ListPager";
import { useBackendLocalization } from "../hooks/useBackendLocalization";

// Highlighter component for Search term
const HighlightText = ({ text, searchTerm }) => {
  if (!text) return "—";
  if (!searchTerm) return text;
  const str = String(text);
  const idx = str.toLowerCase().indexOf(searchTerm.toLowerCase());
  if (idx === -1) return str;
  return (
    <span>
      {str.slice(0, idx)}
      <mark className="rounded-sm bg-pink-200 px-0.5 text-pink-900 dark:bg-pink-500/40 dark:text-pink-100">
        {str.slice(idx, idx + searchTerm.length)}
      </mark>
      {str.slice(idx + searchTerm.length)}
    </span>
  );
};

export default function WorkCodesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const localize = useBackendLocalization("Billing");
  // Like ABP, a key the backend does not define is shown as the key itself.
  const text = (key) => localize(key) || key;
  const canCreate = usePermission("Billing.WorkDoneCodes.Create");
  const canEdit = usePermission("Billing.WorkDoneCodes.Edit");
  const canViewAuditLog = usePermission("Billing.WorkDoneCodes.ViewAuditLog");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [advSearchCode, setAdvSearchCode] = useState("");
  const [advSearchDesc, setAdvSearchDesc] = useState("");
  const [debouncedAdvSearchCode, setDebouncedAdvSearchCode] = useState("");
  const [debouncedAdvSearchDesc, setDebouncedAdvSearchDesc] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Sorting is done by the backend: the column name is the WorkDoneCode field.
  const [sortKey, setSortKey] = useState("Code");
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (field) => {
    if (sortKey === field) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortKey !== field) return <ArrowUpDown size={13} />;
    return sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await workCodesApi.getAll({ sorting: `${sortKey} ${sortDir}` });
      const allData = Array.isArray(resp) ? resp : (resp?.items || []);
      setData(allData);
    } catch (err) {
      const message = getApiErrorMessage(err);
      if (message) toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast, sortKey, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedAdvSearchCode(advSearchCode);
      setDebouncedAdvSearchDesc(advSearchDesc);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, advSearchCode, advSearchDesc]);

  const handleNew = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setModalOpen(true);
  };

  const handleModalSubmit = async (payload) => {
    if (editItem) {
      await workCodesApi.update(editItem.id, payload);
    } else {
      await workCodesApi.create(payload);
    }
    toast(localize("OperationSuccessfull"));
    setModalOpen(false);
    setEditItem(null);
    fetchData();
  };

  const breadcrumb = [
    { key: "Home", isHome: true },
    { key: "Menu:Administration" },
    { key: "Lookups" },
    { key: "WorkDoneCodes" },
  ];

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const globalMatch = debouncedSearch
        ? (d.code || "").toLowerCase().includes(debouncedSearch.toLowerCase())
        : true;
      const matchCode = debouncedAdvSearchCode
        ? (d.code || "").toLowerCase().includes(debouncedAdvSearchCode.toLowerCase())
        : true;
      const matchDesc = debouncedAdvSearchDesc
        ? (d.description || "").toLowerCase().includes(debouncedAdvSearchDesc.toLowerCase())
        : true;
      return globalMatch && matchCode && matchDesc;
    });
  }, [data, debouncedSearch, debouncedAdvSearchCode, debouncedAdvSearchDesc]);

  const totalCount = filteredData.length;

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-slate-900 dark:text-white">
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

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="app-page-header flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
            {breadcrumb.map((b, i) => (
              <span key={b.key} className="flex items-center gap-1.5">
                <span
                  onClick={() => b.isHome && navigate("/")}
                  className={
                    i === breadcrumb.length - 1
                      ? "text-pink-500"
                      : b.isHome
                        ? "hover:text-pink-500 cursor-pointer transition-colors"
                        : ""
                  }
                >
                  {text(b.key)}
                </span>
                {i < breadcrumb.length - 1 && <span className="text-slate-300 dark:text-slate-700">/</span>}
              </span>
            ))}
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
              {text("WorkDoneCodes")}
            </h1>
            {canCreate && <button
              onClick={handleNew}
              className="app-primary-button w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-xs"
            >
              <Plus size={16} className="mr-2" strokeWidth={3} />
              {localize("NewWorkDoneCode")}
            </button>}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative w-full sm:max-w-md group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={14} className={search ? "text-pink-500" : "text-slate-400 dark:text-slate-500 transition-colors"} />
                </div>
                <input
                  type="text"
                  placeholder={localize("SearchInTablePlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/50 text-[12px] outline-none transition-all focus:border-pink-600 focus:ring-4 focus:ring-pink-600/10 shadow-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-pink-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${showAdvanced ? "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-500/10 dark:border-pink-500/30 dark:text-pink-400" : "bg-white text-slate-500 border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-800/50 dark:text-slate-400 hover:text-pink-600"}`}
                aria-expanded={showAdvanced}
              >
                <Filter size={14} />
                {localize("AdvancedSearch")}
              </button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={localize("Code")}
                    value={advSearchCode}
                    onChange={(e) => setAdvSearchCode(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-[11px] outline-none transition-all focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  {advSearchCode && (
                    <button onClick={() => setAdvSearchCode("")} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-pink-500 transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={localize("Description")}
                    value={advSearchDesc}
                    onChange={(e) => setAdvSearchDesc(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-[11px] outline-none transition-all focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10 font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  {advSearchDesc && (
                    <button onClick={() => setAdvSearchDesc("")} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-pink-500 transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex flex-col w-full h-auto relative">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse py-20">
              {localize("LoadingWithThreeDot")}
            </div>
          ) : data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] py-20">
              {localize("NoDataAvailableInDatatable")}
            </div>
          ) : (
            <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar">
              <table className="w-full min-w-[520px] table-fixed text-left border-separate border-spacing-y-1 text-[11px]">
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '100%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px] text-slate-500 dark:text-slate-400">
                    <th className="px-5 pl-8 h-[56px] text-[10px] font-black uppercase tracking-widest text-left">
                      <button type="button" onClick={() => handleSort("Code")} className="inline-flex items-center gap-1.5 uppercase hover:text-pink-600 dark:hover:text-pink-400" aria-label={localize("Code")}>
                        {localize("Code")} <SortIcon field="Code" />
                      </button>
                    </th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-center">
                      <button type="button" onClick={() => handleSort("Description")} className="inline-flex items-center gap-1.5 uppercase hover:text-pink-600 dark:hover:text-pink-400" aria-label={localize("Description")}>
                        {localize("Description")} <SortIcon field="Description" />
                      </button>
                    </th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-center">{localize("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={row.id || idx}
                        className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                      >
                        <td className="px-5 pl-8 rounded-l-2xl h-[60px] text-left transition-colors font-bold text-[12px]">
                          <div className="flex items-center gap-3">
                            <HighlightText text={row.code} searchTerm={debouncedSearch || debouncedAdvSearchCode} />
                          </div>
                        </td>
                        <td className="px-5 h-[60px] text-center transition-colors">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold tracking-wider text-[11px]">
                            <HighlightText text={row.description} searchTerm={debouncedAdvSearchDesc} />
                          </span>
                        </td>
                        <td className="px-5 rounded-r-2xl h-[60px] text-center transition-colors">
                          <ActionsMenu
                            onEdit={canEdit ? () => handleEdit(row) : undefined}
                            onAuditLog={canViewAuditLog ? () =>
                              navigate(`/audit-logs?primaryKey=${row.id}&entityName=WorkDoneCode`)
                              : undefined
                            }
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ListPager
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          loading={loading}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </div>

      <WorkCodeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSubmit={handleModalSubmit}
        item={editItem}
      />
    </div>
  );
}
