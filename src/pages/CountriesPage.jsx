import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { countriesApi } from "../services/api/countries";
import { useToast } from "../component/common/ToastContext";
import { ActionsMenu } from "../component/common/ResourcePage";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";
import CountryModal from "../component/common/CountryModal";
import { useAuth } from "../context/AuthContextHook";

export default function CountriesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = useMemo(() => user?.role?.toLowerCase().includes("admin"), [user]);

  // Using simple defaults since explicit permissions were not provided
  const canEdit = true;
  const canViewAuditLog = isAdmin;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await countriesApi.getAll();
      const allData = Array.isArray(resp) ? resp : (resp?.items || []);
      setData(allData);
      setTotalCount(allData.length);
    } catch (err) {
      toast("Failed to load countries", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNew = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setModalOpen(true);
  };

  const handleModalSubmit = async (payload) => {
    try {
      if (editItem) {
        await countriesApi.update(editItem.id, payload);
        toast("Country updated");
      } else {
        await countriesApi.create(payload);
        toast("Country created");
      }
      setModalOpen(false);
      setEditItem(null);
      fetchData();
    } catch (err) {
      throw err;
    }
  };

  const breadcrumb = ["Home", "Management", "Lookups", "Countries"];

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-black">
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

      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl text-black">
        {/* Header */}
        <div className="flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50 text-black">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-black mb-1 flex-wrap">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5 text-black">
                <span
                  onClick={() => b === "Home" && navigate("/")}
                  className={
                    i === breadcrumb.length - 1
                      ? "text-black font-black"
                      : b === "Home"
                        ? "text-black hover:opacity-80 cursor-pointer transition-all"
                        : "text-black"
                  }
                >
                  {b}
                </span>
                {i < breadcrumb.length - 1 && <span className="text-black">/</span>}
              </span>
            ))}
          </nav>
          <div className="flex items-center justify-between text-black">
            <h1 className="text-4xl font-black text-black tracking-tighter">
              Countries
            </h1>
            <div className="flex items-center gap-4 text-black">
              <button
                onClick={handleNew}
                className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-pink-500/20 transition-all bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
              >
                <Plus size={16} className="mr-2" strokeWidth={3} />
                Add New
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex flex-col w-full h-auto relative text-black">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-black text-[11px] font-black uppercase tracking-[0.2em] animate-pulse py-20">
              Refreshing data...
            </div>
          ) : data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-black text-[11px] font-black uppercase tracking-[0.2em] py-20">
              No countries found
            </div>
          ) : (
            <div className="overflow-x-auto px-4 pb-4 pt-2 custom-scrollbar text-black">
              <table className="w-full text-left border-separate border-spacing-y-1 min-w-max text-[11px] text-black">
                <thead className="sticky top-0 z-10 text-black">
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-[56px] text-black">
                    <th className="px-5 pl-8 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-left">Country Name</th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-center">Country Code</th>
                    <th className="px-5 h-[56px] text-[10px] font-black uppercase tracking-widest text-black text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-black">
                  {paginatedData.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={row.id || idx}
                        className={`group transition-all duration-200 h-[60px] border-b border-slate-50 dark:border-slate-800/30 text-black ${isEven ? "bg-white dark:bg-[#161920]/40" : "bg-gray-200/50 dark:bg-white/[0.03]"}`}
                      >
                        <td className="px-5 pl-8 rounded-l-2xl h-[60px] text-left transition-colors text-black font-bold text-[12px]">
                          <div className="flex items-center gap-3 text-black">
                            {row.name || "—"}
                          </div>
                        </td>
                        <td className="px-5 h-[60px] text-center transition-colors text-black">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold tracking-wider text-[11px] text-black">
                            {row.code || "—"}
                          </span>
                        </td>
                        <td className="px-5 rounded-r-2xl h-[60px] text-center transition-colors text-black">
                          <ActionsMenu
                            onEdit={canEdit ? () => handleEdit(row) : undefined}
                            onAuditLog={canViewAuditLog ? () =>
                              navigate(`/audit-logs?primaryKey=${row.id}&entityName=Country`)
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

        {/* Pagination Section */}
        <div className="px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between shrink-0 transition-colors rounded-b-3xl text-black">
          <div className="flex items-center gap-4 text-black">
            <div className="flex items-center gap-2.5 text-black">
              <span className="text-[10px] font-black uppercase tracking-widest text-black">Page Size:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-black border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-black uppercase tracking-widest"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s} className="font-sans text-black">{s}</option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800 text-black">
              <p className="text-[10px] font-black uppercase tracking-widest text-black">
                <span className="text-black tabular-nums">
                  {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                </span>
                <span className="text-black mx-1.5">—</span>
                <span className="text-black tabular-nums">
                  {Math.min(page * pageSize, totalCount)}
                </span>
                <span className="text-black mx-2 lowercase font-bold tracking-normal italic">of</span>
                <span className="text-black tabular-nums font-black">
                  {totalCount}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-black">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm text-black">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1 || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="First Page"
              >
                <ChevronsLeft size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Previous Page"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <div className="px-3 flex items-center gap-2 py-1 text-black">
                <span className="text-[10px] font-black text-black uppercase tracking-widest">Page</span>
                <div className="flex items-center gap-1.5 min-w-[40px] justify-center text-black">
                  <span className="text-[11px] font-black text-black tabular-nums leading-none">{page}</span>
                  <span className="text-[10px] font-black text-black">/</span>
                  <span className="text-[10px] font-black text-black tabular-nums leading-none">{Math.ceil(totalCount / pageSize) || 1}</span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-100 dark:bg-slate-700/50 mx-1"></div>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Next Page"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setPage(Math.ceil(totalCount / pageSize))}
                disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-black hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Last Page"
              >
                <ChevronsRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <CountryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSubmit={handleModalSubmit}
        item={editItem}
      />
    </div>
  );
}


