import { useState } from "react";
import ResourcePage from "../component/common/ResourcePage";
import { ticketsApi } from "../services/api/tickets";
import TicketModal from "../component/common/TicketModal";
import TicketDetailModal from "../component/common/TicketDetailModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";

export default function AMSTicketsPage() {
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);

  const columns = [
    { key: "siteName", label: "SITE NAME", bold: true, flex: 1, minWidth: 60 },
    { key: "siteOcn", label: "SITE OCN", flex: 1, minWidth: 50 },
    { key: "ticketNo", label: "CMS NEXT TICKET NO", flex: 1, minWidth: 60 },
    { key: "receivedAt", label: "TICKET RECEIVED DATE TIME", flex: 1.5, minWidth: 80 },
    { key: "status", label: "STATUS", flex: 1, minWidth: 50 },
    { key: "pre", label: "PRE", flex: 1, minWidth: 40 },
    { key: "ticketClosedBy", label: "TICKET CLOSED BY", flex: 1, minWidth: 70 },
    { key: "createdBy", label: "CREATED BY", flex: 1, minWidth: 70 },
    { key: "totalDuration", label: "TOTAL DURATION (HOURS)", flex: 1, minWidth: 80 },
    { key: "closedOn", label: "CMS TICKET CLOSED ON", flex: 1.5, minWidth: 80 },
    { key: "serviceClosedDate", label: "SERVICE CLOSED DATE", flex: 1.5, minWidth: 80 },
  ];

  const customFilterArea = (
    <label className="flex items-center gap-2.5 cursor-pointer ml-4">
      <input
        type="checkbox"
        checked={isAdvancedSearch}
        onChange={(e) => setIsAdvancedSearch(e.target.checked)}
        className="form-checkbox w-[15px] h-[15px] text-[#5da3d5] rounded-sm bg-[#f8f9fa] dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-[#5da3d5]/30 focus:border-[#5da3d5]"
      />
      <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Advanced Search</span>
    </label>
  );

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
        .MuiDataGrid-columnHeader {
          height: auto !important;
          min-height: 80px !important;
        }
        .MuiDataGrid-root {
          border: none !important;
        }
        .MuiDataGrid-cell {
          border-bottom: none !important;
          font-size: 10px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          white-space: nowrap !important;
          overflow: hidden !important;
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
      `}</style>
      <ResourcePage
        title="AMS Tickets"
        apiObject={ticketsApi}
        columns={columns}
        ModalComponent={TicketModal}
        DetailComponent={TicketDetailModal}
        DeleteModal={DeleteConfirmModal}
        createButtonText={null}
        searchPlaceholder="Search..."
        showActions={false}
        wideSearch={true}
        customFilterArea={customFilterArea}
        breadcrumb={["Home", "AMS Tickets"]}
      />
    </>
  );
}
