import { useState, useMemo, useRef } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { holidaysApi } from "../services/api/holidays";
import HolidayModal from "../component/common/HolidayModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { useToast } from "../component/common/ToastContext";
import { Plus } from "lucide-react";


export default function HolidaysPage() {
  const { toast } = useToast();
  const triggerRefetchRef = useRef(null);

  const [filters, setFilters] = useState({
    name: "",
    description: "",
    type: "",
    date: "",
    year: "",
    country: "",
    locations: "",
  });

  const [deleteItem, setDeleteItem] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleClear = () => {
    setFilters({
      name: "",
      description: "",
      type: "",
      date: "",
      year: "",
      country: "",
      locations: "",
    });
  };

  const handleCreateSubmit = async (payload) => {
    setIsCreating(true);
    try {
      await holidaysApi.create(payload);
      toast("Holiday created successfully!");
      setIsCreateOpen(false);
      if (triggerRefetchRef.current) triggerRefetchRef.current();
    } catch (error) {
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "NAME",
        flex: 1,
        minWidth: 120,
        render: (val) => <span className="text-[11px] text-slate-600 font-medium">{val || "—"}</span>,
      },
      {
        key: "description",
        label: "DESCRIPTION",
        flex: 1.2,
        minWidth: 150,
        render: (val) => <span className="text-[11px] text-slate-500 truncate max-w-[140px]">{val || "—"}</span>,
      },
      {
        key: "date",
        label: "DATE",
        flex: 0.8,
        minWidth: 100,
        render: (val) => {
           if (!val) return <span className="text-[11px] text-slate-500">—</span>;
           const d = new Date(val);
           return <span className="text-[11px] text-slate-500">{d.toLocaleDateString("en-GB")}</span>;
        },
      },
      {
        key: "year",
        label: "YEAR",
        flex: 0.5,
        minWidth: 70,
        render: (val) => <span className="text-[11px] text-slate-500">{val || "—"}</span>,
      },
      {
        key: "countryName",
        label: "COUNTRY",
        flex: 1,
        minWidth: 100,
        render: (val) => <span className="text-[11px] text-slate-500">{val || "Global"}</span>,
      },
      {
        key: "locations",
        label: "LOCATIONS",
        flex: 1,
        minWidth: 120,
        render: (val) => <span className="text-[11px] text-slate-500">{val || "—"}</span>,
      },
      {
        key: "type",
        label: "HOLIDAY TYPE",
        flex: 1,
        minWidth: 110,
        render: (val) => <span className="text-[11px] text-slate-500">{val || "—"}</span>,
      },
      {
        key: "disabled",
        label: "DISABLED",
        flex: 0.6,
        minWidth: 80,
        render: (val) => (
          <div className="flex justify-center w-full">
             <input 
               type="checkbox" 
               checked={!!val} 
               readOnly
               className="w-4 h-4 rounded accent-pink-500 border-slate-300 pointer-events-none appearance-none checked:bg-pink-500 checked:border-transparent bg-slate-100 border relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[5px] after:top-[1px] after:w-[4px] after:h-[8px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
             />
          </div>
        )
      }
    ],
    [],
  );

  const filterInputClass =
    "w-full px-3 py-2 bg-slate-100/60 dark:bg-white/5 border-none rounded-lg text-[11px] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-1 focus:ring-blue-400/30 transition-all text-slate-700 dark:text-slate-200";

  const customFilterArea = (
    <div className="w-full bg-transparent p-0 flex flex-col gap-6">
      {/* Breadcrumb and Title Row */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            <span>Home</span>
            <span>/</span>
            <span>Codes</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">Holidays</span>
          </nav>
          <h1 className="text-[32px] font-bold text-slate-700 dark:text-white tracking-tight leading-none">Holidays</h1>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all active:scale-95 text-[12px] font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
        >
          <Plus size={16} strokeWidth={3} /> Add Holiday
        </button>
      </div>

      {/* Filter Row - Manually styled to match table columns */}
      <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.5fr_1fr_1fr_1fr_0.6fr_100px] gap-4 px-2">
         {/* Labels */}
         {["NAME", "DESCRIPTION", "DATE", "YEAR", "COUNTRY", "LOCATIONS", "HOLIDAY TYPE", "DISABLED"].map((l, i) => (
           <div key={l} className={`text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ${l === 'DISABLED' ? 'text-center' : 'pl-1'}`}>{l}</div>
         ))}
         <div></div>

         {/* Inputs */}
         <div><input type="text" value={filters.name} onChange={(e) => setFilters({...filters, name: e.target.value})} className={filterInputClass} /></div>
         <div><input type="text" value={filters.description} onChange={(e) => setFilters({...filters, description: e.target.value})} className={filterInputClass} /></div>
         <div><input type="text" value={filters.date} placeholder="DD/MM/YYYY" onChange={(e) => setFilters({...filters, date: e.target.value})} className={filterInputClass} /></div>
         <div><input type="text" value={filters.year} onChange={(e) => setFilters({...filters, year: e.target.value})} className={filterInputClass} /></div>
         <div><input type="text" value={filters.country} onChange={(e) => setFilters({...filters, country: e.target.value})} className={filterInputClass} /></div>
         <div><input type="text" value={filters.locations} onChange={(e) => setFilters({...filters, locations: e.target.value})} className={filterInputClass} /></div>
         <div><input type="text" value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})} className={filterInputClass} /></div>
         <div className="flex justify-center items-center"></div>
         <div className="flex justify-end pr-1">
            <button 
              onClick={handleClear}
              className="px-4 py-1.5 border border-emerald-400 text-emerald-500 dark:text-emerald-400 bg-white dark:bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg text-[11px] font-bold transition-colors w-full"
            >
              Clear
            </button>
         </div>
      </div>
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
    if (filters.locations) p.Locations = filters.locations;
    return p;
  }, [filters]);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 -mx-6 -mt-6">
      <div className="bg-white dark:bg-[#020617] rounded-none lg:rounded-3xl shadow-2xl shadow-slate-200/40 dark:shadow-none border-x-0 lg:border-x border-t-0 lg:border-t border-slate-100 dark:border-white/5 overflow-hidden flex flex-col flex-1 w-full min-w-0">
        <ResourcePage
          title="Holidays"
          apiObject={holidaysApi}
          columns={columns}
          ModalComponent={HolidayModal}
          showSearchBar={false}
          hideHeader={true}
          customFilterArea={customFilterArea}
          extraParams={extraParams}
          showActions={true}
          wideSearch="full"
          initialPageSize={100}
          entityName="Holiday"
          initialSortKey="date"
          initialSortDir="desc"
          onRefetchReady={(refetch) => { triggerRefetchRef.current = refetch; }}
          onDelete={(row) => setDeleteItem(row)}
          containerClassName="bg-transparent dark:bg-transparent flex flex-col flex-1 w-full"
          rowHeight={52}
          actionButtonClassName="grid-action-button"
          actionButtonText="Actions"
        />
      </div>

      <HolidayModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        loading={isCreating}
      />

      <DeleteConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={async () => {
          try {
            await holidaysApi.delete(deleteItem.id);
            toast("Holiday deleted successfully");
            if (triggerRefetchRef.current) triggerRefetchRef.current();
            setDeleteItem(null);
          } catch (error) {
            toast(error.message || "Failed to delete holiday", "error");
          }
        }}
        title="Delete Holiday"
        message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
      />

      <style>{`
        .MuiDataGrid-columnHeaders {
          display: none !important;
        }
        .MuiDataGrid-row {
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .MuiDataGrid-cell {
          border: none !important;
          outline: none !important;
        }
        .MuiDataGrid-root {
          border: none !important;
        }
        /* Custom Actions Button Look from screenshot */
        .grid-action-button {
          background-color: #2563eb !important;
          color: white !important;
          border-radius: 4px !important;
          padding: 4px 12px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          text-transform: capitalize !important;
        }
        .grid-action-button::after {
          content: '▼';
          font-size: 8px;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
}
