import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sitesApi } from "../services/api/sites";
import { useToast } from "../component/common/ToastContext";
import { ActionsMenu } from "../component/common/ResourcePage";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Search, X } from "lucide-react";
import SiteModal from "../component/common/SiteModal";
import SiteDetailModal, { SiteDetailContent } from "../component/common/SiteDetailModal";

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
      <mark className="bg-pink-100 dark:bg-pink-500/30 text-pink-700 dark:text-pink-100 rounded-[2px] px-[2px]">
        {str.slice(idx, idx + searchTerm.length)}
      </mark>
      {str.slice(idx + searchTerm.length)}
    </span>
  );
};

export default function SitesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);



  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await sitesApi.getAll({
        page,
        perPage: pageSize,
        search: debouncedSearch,
      });
      setData(resp.items || resp.data || []);
      setTotalCount(resp.totalCount || resp.total || 0);
    } catch (err) {
      toast("Failed to load sites", "error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNew = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      if (editItem) {
        await sitesApi.update(editItem.id, payload);
        toast("Site updated successfully");
      } else {
        await sitesApi.create(payload);
        toast("Site created successfully");
      }
      setModalOpen(false);
      setEditItem(null);
      fetchData();
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDetail = (item) => {
    setDetailItem(item);
    setDetailModalOpen(true);
  };


  const breadcrumb = ["Home", "Management", "Lookups", "Sites"];

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial]">
      <style>{`
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        td, tr { overflow: visible !important; }

        .custom-scrollbar::-webkit-scrollbar:horizontal { height: 8px; display: block !important; }
        .custom-scrollbar::-webkit-scrollbar:vertical { display: none !important; width: 0 !important; }
        .custom-scrollbar { scrollbar-width: thin !important; }
        .custom-scrollbar::-webkit-scrollbar-track:horizontal { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:horizontal,
        :is(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:horizontal,
        html.dark .custom-scrollbar::-webkit-scrollbar-thumb:horizontal { background-color: #334155 !important; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1 flex-wrap">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span
                  onClick={() => b === "Home" && navigate("/")}
                  className={
                    i === breadcrumb.length - 1
                      ? "text-pink-500"
                      : b === "Home"
                        ? "hover:text-pink-500 cursor-pointer transition-colors"
                        : ""
                  }
                >
                  {b}
                </span>
                {i < breadcrumb.length - 1 && <span className="text-slate-300 dark:text-slate-700">/</span>}
              </span>
            ))}
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Sites
            </h1>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <div className="relative w-full sm:w-64 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={14} className={search ? "text-pink-500" : "text-slate-400 dark:text-slate-500 transition-colors"} />
                </div>
                <input
                  type="text"
                  placeholder="Search by Site name, OCN..."
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
                onClick={handleNew}
                className="w-full sm:w-auto inline-flex justify-center items-center px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
              >
                <Plus size={16} className="mr-2" strokeWidth={3} />
                Create Site
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex flex-col w-full h-auto relative text-slate-900 dark:text-white">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse py-10">
              Refreshing data...
            </div>
          ) : data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] py-10">
              No sites found
            </div>
          ) : (
            <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar text-slate-900 dark:text-white">
              <table className="w-full text-left border-separate border-spacing-y-1 min-w-max text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px]">
                    <th className="px-5 pl-8 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-left">NAME</th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-left">OCN</th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-left">COUNTRY</th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-left">ADDRESS</th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={row.id || idx}
                        className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                      >
                        <td className="px-5 pl-8 rounded-l-2xl h-[60px] text-left transition-colors text-slate-900 dark:text-white font-bold text-[12px]">
                          <HighlightText text={row.name} searchTerm={debouncedSearch} />
                        </td>
                        <td className="px-5 h-[60px] text-left transition-colors text-slate-900 dark:text-white">
                          <span className="font-mono font-bold text-[12px] text-slate-900 dark:text-white">
                            <HighlightText text={row.ocn} searchTerm={debouncedSearch} />
                          </span>
                        </td>
                        <td className="px-5 h-[60px] text-left transition-colors text-slate-900 dark:text-white font-bold text-[11px]">
                          {row.countryName || "—"}
                        </td>
                        <td className="px-5 h-[60px] text-left transition-colors text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                          {row.address || "—"}
                        </td>
                        <td className="px-5 rounded-r-2xl h-[60px] text-center transition-colors text-slate-900 dark:text-white">
                          <ActionsMenu
                            onEdit={() => handleEdit(row)}
                            onDetail={() => handleDetail(row)}
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

        {/* Pagination Section */}
        <div className="px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Page Size:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s} className="font-sans">{s}</option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <span className="text-slate-900 dark:text-white tabular-nums">
                  {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                </span>
                <span className="text-slate-400 dark:text-slate-600 mx-1.5">—</span>
                <span className="text-slate-900 dark:text-white tabular-nums">
                  {Math.min(page * pageSize, totalCount)}
                </span>
                <span className="text-slate-400 dark:text-slate-500 mx-2 lowercase font-bold tracking-normal italic">of</span>
                <span className="text-slate-900 dark:text-white tabular-nums font-black">
                  {totalCount}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1 || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="First Page"
              >
                <ChevronsLeft size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Previous Page"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <div className="px-3 flex items-center gap-2 py-1">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Page</span>
                <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                  <span className="text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums leading-none">{page}</span>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-600">/</span>
                  <span className="text-[10px] font-black text-slate-900 dark:text-white tabular-nums leading-none">{Math.ceil(totalCount / pageSize) || 1}</span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Next Page"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setPage(Math.ceil(totalCount / pageSize))}
                disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Last Page"
              >
                <ChevronsRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SiteModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); setSubmitError(null); }}
        onSubmit={handleSubmit}
        site={editItem}
        loading={submitLoading}
        submitError={submitError}
      />

      {detailItem && (
        <SiteDetailModal
          open={detailModalOpen}
          onClose={() => { setDetailModalOpen(false); setDetailItem(null); }}
          item={detailItem}
          SecondaryDetailComponent={SiteDetailContent}
        />
      )}

    </div>
  );
}
