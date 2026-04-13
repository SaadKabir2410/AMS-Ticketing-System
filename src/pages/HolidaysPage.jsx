import { useState, useMemo, useRef } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { holidaysApi } from "../services/api/holidays";
import HolidayModal from "../component/common/HolidayModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { useToast } from "../component/common/ToastContext";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import "flatpickr/dist/themes/dark.css";
import { usePermission } from "../hooks/usePermission";
import { PermissionGuard } from "../component/common/PermissionGuard";
import { useNavigate } from "react-router-dom";

const LOCAL_COUNTRIES = [
  { id: "gb", name: "United Kingdom", code: "GB" },
  { id: "my", name: "Malaysia", code: "MY" },
  { id: "us", name: "United States", code: "US" },
  { id: "au", name: "Australia", code: "AU" },
  { id: "ca", name: "Canada", code: "CA" },
  { id: "de", name: "Germany", code: "DE" },
  { id: "fr", name: "France", code: "FR" },
  { id: "in", name: "India", code: "IN" },
  { id: "sg", name: "Singapore", code: "SG" },
  { id: "ae", name: "United Arab Emirates", code: "AE" },
  { id: "jp", name: "Japan", code: "JP" },
  { id: "cn", name: "China", code: "CN" },
  { id: "za", name: "South Africa", code: "ZA" },
  { id: "ng", name: "Nigeria", code: "NG" },
  { id: "pk", name: "Pakistan", code: "PK" },
  { id: "bd", name: "Bangladesh", code: "BD" },
  { id: "id", name: "Indonesia", code: "ID" },
  { id: "ph", name: "Philippines", code: "PH" },
  { id: "nz", name: "New Zealand", code: "NZ" },
  { id: "ie", name: "Ireland", code: "IE" },
];

const HOLIDAY_TYPES = [
  "Public",
  "Regional",
  "Optional",
  "Bank Holiday",
  "Other",
];


export default function HolidaysPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const triggerRefetchRef = useRef(null);

  const canEdit = usePermission("Billing.Holidays.Edit");
  const canDelete = usePermission("Billing.Holidays.Delete");
  const canViewAuditLog = usePermission("Billing.Holidays.ViewAuditLog");

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
      toast("Holiday created !successfully");
      setIsCreateOpen(false);
      if (triggerRefetchRef.current) triggerRefetchRef.current();
    } catch (error) {
      toast(error?.message || "Operation failed", "error");
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
        render: (val) => <span className="text-[11px] text-slate-600 dark:text-slate-200 font-medium">{val || "—"}</span>,
      },
      {
        key: "description",
        label: "DESCRIPTION",
        flex: 1.2,
        minWidth: 150,
        render: (val) => <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{val || "—"}</span>,
      },
      {
        key: "date",
        label: "DATE",
        flex: 0.8,
        minWidth: 100,
        render: (val) => {
          if (!val) return <span className="text-[11px] text-slate-500 dark:text-slate-400">—</span>;
          const d = new Date(val);
          return <span className="text-[11px] text-slate-500 dark:text-slate-300">{d.toLocaleDateString("en-GB")}</span>;
        },
      },
      {
        key: "year",
        label: "YEAR",
        flex: 0.5,
        minWidth: 70,
        render: (val) => <span className="text-[11px] text-slate-500 dark:text-slate-300">{val || "—"}</span>,
      },
      {
        key: "countryName",
        label: "COUNTRY",
        flex: 1,
        minWidth: 100,
        render: (val) => <span className="text-[11px] text-slate-500 dark:text-slate-300">{val || "Global"}</span>,
      },
      {
        key: "locations",
        label: "LOCATIONS",
        flex: 1,
        minWidth: 120,
        render: (val) => <span className="text-[11px] text-slate-500 dark:text-slate-300">{val || "—"}</span>,
      },
      {
        key: "type",
        label: "HOLIDAY TYPE",
        flex: 1,
        minWidth: 110,
        render: (val) => <span className="text-[11px] text-slate-500 dark:text-slate-300">{val || "—"}</span>,
      },
      {
        key: "isDeleted",
        label: "DISABLED",
        flex: 0.6,
        minWidth: 80,
        render: (val) => (
          <div className="flex justify-center w-full">
            <input
              type="checkbox"
              checked={!!val}
              readOnly
              className="w-4 h-4 rounded accent-blue-500 border-slate-300 dark:border-white/20 pointer-events-none appearance-none checked:btn-flagship dark:checked:btn-flagship checked:border-transparent bg-slate-100 dark:bg-slate-800 border relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[5px] after:top-[1px] after:w-[4px] after:h-[8px] after:border-white after:border-b-2 after:border-r-2 after:rotate-45"
            />
          </div>
        )
      }
    ],
    [],
  );

  const filterInputClass =
    "w-full px-3 py-2 bg-slate-100/60 dark:bg-slate-800/50 border border-transparent dark:border-slate-800 rounded-lg text-[11px] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-1 focus:ring-blue-400/30 transition-all text-slate-700 dark:text-slate-200 shadow-sm";

  const customFilterArea = (
    <div className="w-full bg-transparent p-0 flex flex-col gap-6">
      <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.5fr_1fr_1fr_1fr_0.6fr_100px] items-end w-full">
        {/* Labels */}
        {[
          { label: "NAME" },
          { label: "DESCRIPTION" },
          { label: "DATE" },
          { label: "YEAR" },
          { label: "COUNTRY" },
          { label: "LOCATIONS" },
          { label: "HOLIDAY TYPE" },
          { label: "DISABLED", center: true },
        ].map((l) => (
          <div key={l.label} className={`px-[10px] text-[9px] font-black text-slate-400 dark:text-slate-400/80 uppercase tracking-widest flex items-center mb-1 ${l.center ? 'justify-center' : ''}`}>
            {l.label}
          </div>
        ))}
        <div></div>

        {/* Inputs */}
        <div className="px-[10px] w-full"><input type="text" placeholder="Filter Name..." value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} className={filterInputClass} /></div>
        <div className="px-[10px] w-full"><input type="text" placeholder="Search details..." value={filters.description} onChange={(e) => setFilters({ ...filters, description: e.target.value })} className={filterInputClass} /></div>

        <div className="px-[10px] w-full">
          <Flatpickr
            value={filters.date}
            onChange={([date]) => setFilters({ ...filters, date: date ? date.toISOString().split('T')[0] : "" })}
            options={{ dateFormat: "Y-m-d", allowInput: true }}
            placeholder="YYYY-MM-DD"
            className={filterInputClass}
          />
        </div>

        <div className="px-[10px] w-full"><input type="number" placeholder="2024" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className={filterInputClass} /></div>

        <div className="px-[10px] w-full">
          <select
            value={filters.country}
            onChange={(e) => setFilters({ ...filters, country: e.target.value })}
            className={`${filterInputClass} appearance-none pr-3 cursor-pointer`}
          >
            <option value="">All Countries</option>
            {LOCAL_COUNTRIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div className="px-[10px] w-full"><input type="text" placeholder="Region..." value={filters.locations} onChange={(e) => setFilters({ ...filters, locations: e.target.value })} className={filterInputClass} /></div>

        <div className="px-[10px] w-full">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className={`${filterInputClass} appearance-none pr-3 cursor-pointer`}
          >
            <option value="">All Types</option>
            {HOLIDAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex justify-center items-center h-full px-[10px] w-full">
        </div>
        <div className="flex justify-end px-[10px] w-full">
          <button
            onClick={handleClear}
            className="btn-flagship h-[34px]! px-4! border-slate-200! dark:border-slate-700/50! text-slate-500! hover:text-blue-500! hover:border-blue-500/30! w-full"
            title="Reset All Filters"
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
    <div className="h-full flex flex-col bg-[#f1f5f9] dark:bg-slate-950 transition-colors duration-300 overflow-hidden no-scrollbar">
      <ResourcePage
        title="Holidays"
        apiObject={holidaysApi}
        columns={columns}
        showSearchBar={false}
        hideHeader={false}
        breadcrumb={["Home", "Management", "Lookups", "Holidays"]}
        createButtonText="Add Holiday"
        ModalComponent={HolidayModal} // This ensures the 'New Holiday' button appears in Header
        customFilterArea={customFilterArea}
        extraParams={extraParams}
        showActions={true}
        wideSearch="full"
        initialPageSize={100}
        entityName="Holiday"
        initialSortKey="date"
        initialSortDir="desc"
        onRefetchReady={(refetch) => { triggerRefetchRef.current = refetch; }}
        showAuditLog={false}
        onEditVisibilityCheck={() => false}

        onDisable={(row) => holidaysApi.disable(row)
          .then(() => { toast("Holiday disabled"); triggerRefetchRef.current?.(); })
          .catch(e => toast(e?.message || e?.Message || "Failed to disable", "error"))
        }
        onEnable={(row) => holidaysApi.enable(row)
          .then(() => { toast("Holiday enabled"); triggerRefetchRef.current?.(); })
          .catch(e => toast(e?.message || e?.Message || "Failed to enable", "error"))
        }
        onDisableVisibilityCheck={(row) => !row?.isDeleted}   // show Disable only when NOT deleted
        onEnableVisibilityCheck={(row) => !!row?.isDeleted}    // show Enable only when deleted

        containerClassName="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden flex flex-col flex-1 transition-all duration-300"
        rowHeight={54}
        actionButtonText="Actions"
      />

      <HolidayModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        loading={isCreating}
      />

      <style>{`
        .MuiDataGrid-columnHeaders {
          display: none !important;
        }
        .MuiDataGrid-row {
          border-bottom: none !important;
        }
        .MuiDataGrid-cell {
          border: none !important;
          outline: none !important;
        }
        .MuiDataGrid-root {
          border: none !important;
        }
        .MuiDataGrid-footerContainer {
          border-top: none !important;
        }
        .MuiDataGrid-withBorderColor {
          border-color: transparent !important;
        }
        .MuiDataGrid-columnHeader, .MuiDataGrid-cell, .MuiDataGrid-row, .MuiDataGrid-columnHeaders {
          border: none !important;
          outline: none !important;
        }
        .MuiDataGrid-filler {
          display: none !important;
        }
        .MuiDataGrid-virtualScroller {
          border: none !important;
        }
        /* Dark mode visual improvements */
        .dark .MuiDataGrid-root {
          color: #cbd5e1 !important; /* Slate 300 */
        }
        .dark .MuiDataGrid-row:hover {
          background-color: rgba(255, 255, 255, 0.04) !important;
        }
        .dark .MuiDataGrid-row.Mui-selected {
          background-color: rgba(236, 72, 153, 0.05) !important;
        }
        .dark .MuiDataGrid-row.Mui-selected:hover {
          background-color: rgba(236, 72, 153, 0.1) !important;
        }
      `}</style>
    </div>
  );
}




