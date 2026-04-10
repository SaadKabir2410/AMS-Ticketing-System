import { useState, useEffect } from "react";
import ResourcePage from "../component/common/ResourcePage";
import amsTicketApi from "../services/api/amsTicketApi";
import TicketModal from "../component/common/TicketModal";
import TicketDetailModal from "../component/common/TicketDetailModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import UnclosedTicketsModal from "../component/common/UnclosedTicketsModal";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";

export default function AMSTicketsPage() {
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [isUnclosedModalOpen, setIsUnclosedModalOpen] = useState(false);

  // Advanced search filter state (only used when isAdvancedSearch = true)
  const [advancedFilters, setAdvancedFilters] = useState({
    userId: undefined,
    siteName: "",
    siteOcn: "",
    cmsNextTicketNo: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    // Simulate auto-showing pop-up after login (once per session)
    if (!sessionStorage.getItem("hasSeenUnclosedTicketsModal")) {
      setIsUnclosedModalOpen(true);
      sessionStorage.setItem("hasSeenUnclosedTicketsModal", "true");
    }
  }, []);

  // Function to render inline header filters inside DataGrid columns
  const renderAdvancedHeader = (field, label, type = "text", options = null, listId = null) => {
    return (params) => (
      <div className="flex flex-col w-full h-full justify-between items-start pt-1 pb-1">
        <div className="w-full text-left font-extrabold uppercase text-black dark:text-white whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: "10px" }}>
          {label}
        </div>
        {isAdvancedSearch && (
          <div className="w-[95%]">
            {options ? (
              <div className="relative">
                <select
                  value={advancedFilters[field] || ""}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onChange={(e) => setAdvancedFilters(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full text-[11px] h-8 px-2 rounded-md bg-[#f3f4f6] dark:bg-slate-800 outline-none text-slate-800 dark:text-slate-200 appearance-none cursor-pointer"
                >
                  <option value="">All</option>
                  {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            ) : (
              <input
                type={type}
                list={listId}
                placeholder=""
                value={advancedFilters[field] || ""}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => setAdvancedFilters(p => ({ ...p, [field]: e.target.value }))}
                className="w-full text-[11px] h-8 px-2 rounded-md bg-[#f3f4f6] dark:bg-slate-800 outline-none text-slate-800 dark:text-slate-200"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const columns = [
    {
      key: "siteName",
      label: "SITE NAME",
      bold: true,
      flex: 1.5,
      minWidth: 100,
      render: (val) => val ? val.toUpperCase() : "—",
      renderHeader: renderAdvancedHeader("siteName", "SITE NAME", "text", null, "site-names")
    },
    {
      key: "siteOCN",
      label: "SITE OCN",
      flex: 1,
      minWidth: 110,
      render: (val) => (
        <span className="whitespace-normal break-words font-semibold tracking-wide text-center w-full block">
          {val || "—"}
        </span>
      ),
      renderHeader: renderAdvancedHeader("siteOcn", "SITE OCN", "text", null, "site-ocns")
    },
    {
      key: "cmsNextTicketNo",
      label: "CMS NEXT TICKET NO",
      flex: 1,
      minWidth: 80,
      renderHeader: renderAdvancedHeader("cmsNextTicketNo", "CMS NEXT TICKET NO", "text")
    }, {
      key: "ticketReceivedDate", label: "TICKET RECEIVED DATE TIME", flex: 1.5, minWidth: 130,
      render: (val) => val ? new Date(val).toLocaleString() : "—",
      renderHeader: (params) => (
        <div className="flex flex-col flex-1 min-w-0 h-full justify-between items-start pt-1 pb-1">
          <div className="w-full text-left font-extrabold uppercase text-black dark:text-white whitespace-nowrap overflow-hidden text-ellipsis pr-6" style={{ fontSize: "10px" }}>
            TICKET RECEIVED DATE TIME
          </div>
          {isAdvancedSearch && (
            <div className="w-[95%]" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <div className="flex items-center w-full h-8 rounded-md border border-pink-400 overflow-hidden bg-white dark:bg-slate-800">
                <div className="flex items-center justify-center bg-[#f3f4f6] dark:bg-slate-700 h-full w-8 border-r border-slate-200 dark:border-slate-600">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path></svg>
                </div>
                <Flatpickr
                  data-enable-time
                  value={advancedFilters.dateFrom || ""}
                  onChange={([date]) => setAdvancedFilters(p => ({ ...p, dateFrom: date }))}
                  options={{
                    enableTime: true,
                    dateFormat: "d/m/Y",
                    allowInput: true
                  }}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-[#fefce8] dark:bg-slate-800 text-[10px] h-full px-2 outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      key: "status", label: "STATUS", flex: 1, minWidth: 70,
      render: (val) => val === 1 ? "Open" : val === 2 ? "Closed" : val === 3 ? "Voided" : "—",
      renderHeader: renderAdvancedHeader("status", "STATUS", "select", [
        { value: "1", label: "Open" },
        { value: "2", label: "Closed" },
        { value: "3", label: "Voided" }
      ])
    },
    {
      key: "isPRE", label: "PRE", flex: 1, minWidth: 50,
      render: (val) => (
        <div className="w-full flex items-center justify-center">
          <input
            type="checkbox"
            checked={!!val}
            readOnly
            className="w-[15px] h-[15px] accent-pink-600 rounded cursor-default border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
      ),
      renderHeader: (params) => (
        <div className="flex flex-col flex-1 min-w-0 h-full pt-1 pb-1">
          <div className="w-full text-center font-extrabold uppercase text-black dark:text-white whitespace-nowrap overflow-hidden text-ellipsis px-1 pr-6" style={{ fontSize: "10px" }}>PRE</div>
        </div>
      )
    },
    {
      key: "ticketClosedByName", label: "TICKET CLOSED BY", flex: 1.2, minWidth: 90,
      renderHeader: (params) => (
        <div className="flex flex-col flex-1 min-w-0 h-full pt-1 pb-1">
          <div className="w-full text-left font-extrabold uppercase text-black dark:text-white whitespace-nowrap overflow-hidden text-ellipsis pr-6" style={{ fontSize: "10px" }}>TICKET CLOSED BY</div>
        </div>
      )
    },
    {
      key: "createdBy", label: "CREATED BY", flex: 1.2, minWidth: 90, sortable: false,
      renderHeader: (params) => (
        <div className="flex flex-col flex-1 min-w-0 h-full pt-1 pb-1">
          <div className="w-full text-left font-extrabold uppercase text-black dark:text-white whitespace-nowrap overflow-hidden text-ellipsis pr-6" style={{ fontSize: "10px" }}>CREATED BY</div>
        </div>
      )
    },
    {
      key: "activityTotalDuration", label: "TOTAL DURATION (HOURS)", flex: 1.2, minWidth: 90,
      renderHeader: (params) => (
        <div className="flex flex-col flex-1 min-w-0 h-full pt-1 pb-1">
          <div className="w-full text-left font-extrabold uppercase text-black dark:text-white whitespace-nowrap overflow-hidden text-ellipsis pr-6" style={{ fontSize: "10px" }}>TOTAL DURATION (HOURS)</div>
        </div>
      )
    },
    {
      key: "cmsTicketClosedOn", label: "CMS TICKET CLOSED ON", flex: 1.5, minWidth: 100,
      render: (val) => val ? new Date(val).toLocaleString() : "—",
      renderHeader: (params) => (
        <div className="flex flex-col flex-1 min-w-0 h-full justify-between items-start pt-1 pb-1">
          <div className="w-full text-left font-extrabold uppercase text-black dark:text-white whitespace-nowrap overflow-hidden text-ellipsis pr-6" style={{ fontSize: "10px" }}>
            CMS CLOSED ON
          </div>
          {isAdvancedSearch && (
            <div className="w-[95%]" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <div className="flex items-center w-full h-8 rounded-md border border-slate-200 overflow-hidden bg-[#f3f4f6] dark:bg-slate-800">
                <Flatpickr
                  data-enable-time
                  value={advancedFilters.dateTo || ""}
                  onChange={([date]) => setAdvancedFilters(p => ({ ...p, dateTo: date }))}
                  options={{
                    enableTime: true,
                    dateFormat: "d/m/Y",
                    allowInput: true
                  }}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-transparent text-[10px] h-full px-2 outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      key: "serviceClosedDate", label: "SERVICE CLOSED DATE", flex: 1.5, minWidth: 100,
      render: (val) => val ? new Date(val).toLocaleString() : "—",
      renderHeader: (params) => (
        <div className="flex flex-col flex-1 min-w-0 h-full pt-1 pb-1">
          <div className="w-full text-left font-extrabold uppercase text-black dark:text-white whitespace-nowrap overflow-hidden text-ellipsis pr-6" style={{ fontSize: "10px" }}>SERVICE CLOSED DATE</div>
        </div>
      )
    }
  ];

  // Build the extra params that ResourcePage/getAll will receive when advanced search is on
  const extraParams = isAdvancedSearch
    ? {
      userId: advancedFilters.userId,
      status: advancedFilters.status || undefined,
      dateFrom: advancedFilters.dateFrom
        ? new Date(advancedFilters.dateFrom).toISOString()
        : undefined,
      dateTo: advancedFilters.dateTo
        ? new Date(advancedFilters.dateTo).toISOString()
        : undefined,
      siteName: advancedFilters.siteName || undefined,
      siteOcn: advancedFilters.siteOcn || undefined,
      cmsNextTicketNo: advancedFilters.cmsNextTicketNo || undefined,
    }
    : {};

  const [sites, setSites] = useState([]);

  // Fetch sites to populate comboboxes
  useEffect(() => {
    import("../services/api/sites").then(mod => {
      mod.sitesApi.getAll({ perPage: 1000 }).then(r => setSites(r.items || []));
    }).catch(console.error);
  }, []);

  const customFilterArea = (
    <div className="flex items-center relative gap-4">
      {/* Hidden Datalists for Combobox behavior */}
      <datalist id="site-names">
        {sites.map(s => <option key={s.id} value={s.name} />)}
      </datalist>
      <datalist id="site-ocns">
        {sites.map(s => <option key={s.id} value={s.ocn} />)}
      </datalist>

      {/* Advanced Search toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer ml-4">
        <input
          type="checkbox"
          checked={isAdvancedSearch}
          onChange={(e) => {
            setIsAdvancedSearch(e.target.checked);
            if (!e.target.checked) setAdvancedFilters({ userId: undefined, siteName: "", siteOcn: "", cmsNextTicketNo: "", status: "", dateFrom: "", dateTo: "" });
          }}
          className="form-checkbox w-[15px] h-[15px] text-[#5da3d5] rounded-sm bg-[#f8f9fa] dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-[#5da3d5]/30 focus:border-[#5da3d5]"
        />
        <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
          Advanced Search
        </span>
      </label>

      {/* Clear Filters Button */}
      {isAdvancedSearch && (
        <button
          onClick={() => setAdvancedFilters({ userId: undefined, siteName: "", siteOcn: "", cmsNextTicketNo: "", status: "", dateFrom: "", dateTo: "" })}
          className="ml-2 px-3 h-7 flex items-center justify-center text-[10px] font-bold tracking-wider text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-md transition-colors border border-red-200 dark:border-red-900"
        >
          CLEAR
        </button>
      )}

    </div>
  );

  // ✅ FIX: Delete handler that voids the ticket
  const handleDelete = async (row) => {
    try {
      await amsTicketApi.delete(row);
      console.log('Ticket voided successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  };

  return (
    <>
      <style>{`
        .MuiDataGrid-columnHeaderTitle {
          white-space: normal !important;
          line-height: normal !important;
          text-align: center !important;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px !important;
        }
        .MuiDataGrid-root {
          border: none !important;
        }
        .MuiDataGrid-cell {
          border-bottom: none !important;
          font-size: 11px !important;
          padding-top: 14px !important;
          padding-bottom: 14px !important;
        }
        .MuiDataGrid-row {
          border-bottom: none !important;
        }
        .MuiDataGrid-columnSeparator {
          display: none !important;
        }
        .MuiDataGrid-virtualScroller {
          overflow-x: hidden !important;
        }
        .MuiDataGrid-menuIcon {
          display: none !important;
        }
        .row-open {
          background-color: #fee2e2 !important; /* more intense red, red-100 */
          color: #b91c1c !important; /* text-red-700 */
          font-weight: 600;
        }
        .dark .row-open {
          background-color: rgba(220, 38, 38, 0.2) !important;
          color: #fca5a5 !important; /* text-red-300 */
        }
        .row-open:hover {
          background-color: #fecaca !important;
        }
        .dark .row-open:hover {
          background-color: rgba(220, 38, 38, 0.3) !important;
        }
      `}</style>
      <ResourcePage
        title="AMS Tickets"
        apiObject={amsTicketApi}
        getRowClassName={(params) => params.row.status === 1 ? 'row-open' : ''}
        columns={columns.map(c => ({
          ...c,
          align: "center",
          headerAlign: "center",
          disableColumnMenu: true
        }))}
        ModalComponent={TicketModal}
        DetailComponent={TicketDetailModal}
        DeleteModal={DeleteConfirmModal}
        createButtonText="New Ticket"
        customFilterArea={customFilterArea}
        breadcrumb={["Home", "AMS Tickets"]}
        extraParams={extraParams}
        entityName="AMSTicket"
        showAuditLog={true}
        onDelete={handleDelete}
        deleteButtonText="Void"
        initialSortKey="status"
        initialSortDir="asc"
        rowHeight="auto"
        headerHeight={80}
        gridAutoHeight={true}
        wideSearch="full"
        wrapperClassName="min-h-full h-auto bg-[#f1f5f9] dark:bg-slate-950 overflow-y-auto flex flex-col no-scrollbar p-2 transition-all duration-500 animate-in fade-in"
      />
      
      <UnclosedTicketsModal 
        open={isUnclosedModalOpen} 
        onClose={() => setIsUnclosedModalOpen(false)} 
      />
    </>
  );
}