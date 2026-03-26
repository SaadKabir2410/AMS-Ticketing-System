import { useState, useMemo } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { holidaysApi } from "../services/api/holidays";


// Highlight matching text within a string
function Highlight({ text, query }) {
  if (!text) return <span>—</span>;
  if (!query || !query.trim()) return <span>{text}</span>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escaped})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-amber-300/80 dark:bg-amber-400/30 text-amber-900 dark:text-amber-200 rounded px-0.5 not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export default function HolidaysPage() {
  const [filters, setFilters] = useState({
    name: "",
    description: "",
    type: "",
    date: "",
    year: "",
    country: "",
    location: "",
  });

  const handleClear = () => {
    setFilters({
      name: "",
      description: "",
      type: "",
      date: "",
      year: "",
      country: "",
      location: "",
    });
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "HOLIDAY NAME",
        bold: true,
        render: (val) => (
          <span className=" text-slate-800 dark:text-white truncate max-w-[150px]">
            <Highlight text={val} query={filters.name} />
          </span>
        ),
      },
      {
        key: "description",
        label: "DESCRIPTION",
        render: (val) => (
          <span
            className="text-[10px] text-slate-500 truncate max-w-[200px] block"
            title={val}
          >
            <Highlight text={val} query={filters.description} />
          </span>
        ),
      },
      {
        key: "type",
        label: "TYPE",
        render: (val) => (
          <span
            className={`px-2 py-0.5 rounded-lg text-[9px] border ${
              val === "Public"
                ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20"
                : val === "Regional"
                  ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:border-purple-500/20"
                  : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:border-white/10"
            }`}
          >
            <Highlight text={val || "General"} query={filters.type} />
          </span>
        ),
      },
      {
        key: "date",
        label: "DATE",
        render: (val) => {
          if (!val) return "—";
          const d = new Date(val);
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 shadow-inner overflow-hidden shrink-0">
                <div className="bg-blue-500 w-full text-[7px] text-white flex items-center justify-center tracking-tighter py-0.5">
                  {d.toLocaleDateString("en-US", { month: "short" })}
                </div>
                <span className="text-[10px] leading-tight pt-0.5">
                  {d.getDate()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-700 dark:text-white leading-tight">
                  {d.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: "year",
        label: "YEAR",
        render: (val) => (
          <Highlight text={String(val ?? "")} query={filters.year} />
        ),
      },
      {
        key: "countryName",
        label: "COUNTRY",
        render: (val, row) => (
          <div className="flex items-center gap-1.5">
            <span className=" text-slate-700 dark:text-white text-xs">
              <Highlight text={val || "Global"} query={filters.country} />
            </span>
            {row.countryISOCode && (
              <span className="text-[9px] bg-slate-100 dark:bg-white/5 px-1 rounded text-slate-500">
                {row.countryISOCode}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "locations",
        label: "LOCATIONS",
        render: (val) => (
          <span className="text-[10px] text-slate-400 truncate max-w-[120px] block">
            <Highlight text={val || "—"} query={filters.location} />
          </span>
        ),
      },
      {
        key: "isDeleted",
        label: "STATUS",
        render: (val) => (
          <div
            className={`px-2 py-1 text-[10px] text-center rounded-lg border transition-colors ${val ? "bg-red-50 border-red-100 text-red-500 dark:bg-red-500/10 dark:border-red-500/20" : "bg-green-50 border-green-100 text-green-500 dark:bg-green-500/10 dark:border-green-500/20"}`}
          >
            {val ? "Deleted" : "Active"}
          </div>
        ),
      },
    ],
    [filters],
  );

  const filterInputClass =
    "pl-3 pr-3 py-3 text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 w-full shadow-sm";

  const customFilterArea = (
    <div className="flex items-center gap-4 flex-wrap flex-1 bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
      {/* Name Search (Small) */}
      <div className="max-w-[140px] w-full">
        <input
          type="text"
          placeholder="NAME..."
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          className={filterInputClass}
        />
      </div>

      {/* Description Search (Flexible) */}
      <div className="flex-1 min-w-[180px]">
        <input
          type="text"
          placeholder="DESCRIPTION..."
          value={filters.description}
          onChange={(e) =>
            setFilters({ ...filters, description: e.target.value })
          }
          className={filterInputClass}
        />
      </div>

      {/* Type Search */}
      <div className="min-w-[130px]">
        <input
          type="text"
          placeholder="TYPE..."
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className={filterInputClass}
        />
      </div>

      {/* Date Filter */}
      <div className="min-w-[140px]">
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          className={filterInputClass + " "}
        />
      </div>

      {/* Year Filter */}
      <div className="max-w-[100px]">
        <input
          type="text"
          placeholder="YEAR..."
          value={filters.year}
          onChange={(e) => setFilters({ ...filters, year: e.target.value })}
          className={filterInputClass}
        />
      </div>

      {/* Country Filter */}
      <div className="min-w-[130px]">
        <input
          type="text"
          placeholder="COUNTRY..."
          value={filters.country}
          onChange={(e) => setFilters({ ...filters, country: e.target.value })}
          className={filterInputClass}
        />
      </div>

      {/* Location Filter */}
      <div className="min-w-[130px]">
        <input
          type="text"
          placeholder="LOCATION..."
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          className={filterInputClass}
        />
      </div>

      {/* Clear Button */}
      <button
        onClick={handleClear}
        className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-400 font-medium hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 shadow-sm min-w-[46px]"
        title="Clear Filters"
      >
        Clear
      </button>
    </div>
  );

  const extraParams = useMemo(() => {
    const p = {};
    if (filters.name) p.Name = filters.name;
    if (filters.description) p.Description = filters.description;
    if (filters.type) p.Type = filters.type;
    if (filters.date) p.Date = filters.date;
    if (filters.year) p.Year = filters.year;
    if (filters.country) p.CountryName = filters.country;
    if (filters.location) p.Locations = filters.location;
    return p;
  }, [filters]);

  return (
    <ResourcePage
      title="Holidays"
      apiObject={holidaysApi}
      columns={columns}
      searchPlaceholder="Global search..."
      breadcrumb={["Home", "Management", "Lookups", "Holidays"]}
      showSearchBar={false}
      customFilterArea={customFilterArea}
      extraParams={extraParams}
      showActions={false}
      initialPageSize={100}
      entityName="Holiday"
      initialSortKey="date"
      initialSortDir="desc"
    />
  );
}
