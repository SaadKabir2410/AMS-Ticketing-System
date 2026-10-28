import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import AppSelect from "./AppSelect";
import { useBackendLocalization } from "../../hooks/useBackendLocalization";

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

const pagerButtonClass =
  "w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all";

/**
 * Footer pager for list pages. Every text comes from the backend ABP pager
 * texts ("Show _MENU_ entries", "Showing {0} to {1} of {2} entries", First...).
 */
export default function ListPager({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  className = "",
}) {
  const localize = useBackendLocalization("AbpUi");
  const pageCount = Math.max(Math.ceil(totalCount / pageSize), 1);
  const firstEntry = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const lastEntry = Math.min(page * pageSize, totalCount);
  const pagerInfo = totalCount > 0
    ? localize("PagerInfo{0}{1}{2}")
      .replace("{0}", firstEntry)
      .replace("{1}", lastEntry)
      .replace("{2}", totalCount)
    : localize("PagerInfoEmpty");
  const [showBefore, showAfter = ""] = localize("PagerShowMenuEntries").split("_MENU_");

  return (
    <div className={`px-3 sm:px-6 py-4 bg-white/80 dark:bg-[#161920] border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap items-center justify-center sm:justify-between gap-3 shrink-0 transition-colors rounded-b-3xl ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {onPageSizeChange && (
          <span className="flex items-center gap-2.5">
            {showBefore}
            <AppSelect
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="px-3 h-7 text-[10px] font-black bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700/50 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size} className="font-sans text-slate-900 dark:text-white">{size}</option>
              ))}
            </AppSelect>
            {showAfter}
          </span>
        )}
        <span className="tabular-nums">{pagerInfo}</span>
      </div>

      <div className="flex items-center gap-1 bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm">
        <button type="button" onClick={() => onPageChange(1)} disabled={page <= 1 || loading} className={pagerButtonClass} title={localize("PagerFirst")}>
          <ChevronsLeft size={14} strokeWidth={2.5} />
        </button>
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1 || loading} className={pagerButtonClass} title={localize("PagerPrevious")}>
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>
        <span className="px-3 text-[11px] font-black text-pink-600 dark:text-pink-400 tabular-nums">
          {page} / {pageCount}
        </span>
        <button type="button" onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page >= pageCount || loading} className={pagerButtonClass} title={localize("PagerNext")}>
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
        <button type="button" onClick={() => onPageChange(pageCount)} disabled={page >= pageCount || loading} className={pagerButtonClass} title={localize("PagerLast")}>
          <ChevronsRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
