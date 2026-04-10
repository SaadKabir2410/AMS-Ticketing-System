import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { X, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { amsTicketApi } from "../../services/api/amsTicketApi";

const columns = [
  { field: "siteName", headerName: "SITE NAME", flex: 1.5 },
  { field: "siteOCN", headerName: "SITE OCN", flex: 1 },
  { field: "cmsNextTicketNo", headerName: "CMS NEXT TICKET NO", flex: 1.2 },
  { 
    field: "ticketReceivedDate", 
    headerName: "TICKET RECEIVED DATE TIME", 
    flex: 1.5, 
    renderCell: (params) => params.value ? new Date(params.value).toLocaleString() : "—"
  },
  { 
    field: "status", 
    headerName: "STATUS", 
    flex: 0.8, 
    renderCell: (params) => params.value === 1 ? "Open" : params.value === 2 ? "Closed" : params.value === 3 ? "Voided" : "—"
  },
  { 
    field: "ticketAssignedToName", 
    headerName: "TICKET ASSIGNED TO", 
    flex: 1.2, 
    renderCell: (params) => params.row?.ticketAssignedToName || params.row?.ticketAssignedToUsername || "—" 
  },
  { 
    field: "isPRE", 
    headerName: "PRE", 
    flex: 0.5, 
    minWidth: 40,
    renderCell: (params) => <div className="flex justify-center w-full"><input type="checkbox" checked={!!params.value} readOnly disabled className="cursor-default" /></div>
  },
  { field: "createdBy", headerName: "CREATED BY", flex: 1 },
  { field: "activityTotalDuration", headerName: "TOTAL DURATION (HOURS)", flex: 1 },
  { field: "cmsTicketClosedOn", headerName: "CMS TICKET CLOSED ON", flex: 1.2, renderCell: (params) => params.value ? new Date(params.value).toLocaleString() : "—" },
  { field: "serviceClosedDate", headerName: "SERVICE CLOSED DATE", flex: 1.2, renderCell: (params) => params.value ? new Date(params.value).toLocaleString() : "—" }
].map(c => ({
  ...c,
  headerClassName: 'super-app-theme--header',
  renderHeader: (params) => (
    <div className="w-full text-center font-bold uppercase text-slate-500 whitespace-normal leading-tight mx-auto" style={{ fontSize: "9px", letterSpacing: "0.5px", wordWrap: "break-word" }}>
      {c.headerName}
    </div>
  ),
  cellClassName: 'text-[11px] text-slate-600 text-center flex items-center justify-center',
}));

export default function UnclosedTicketsModal({ open, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortModel, setSortModel] = useState([]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, page, pageSize, sortModel]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await amsTicketApi.getAll({
        page: page,
        perPage: pageSize,
        status: 1, // Using the enum integer 1 for "Open" status
        sortKey: sortModel.length > 0 ? sortModel[0].field : undefined,
        sortDir: sortModel.length > 0 ? sortModel[0].sort : "desc",
      });
      setRows(res.items || []);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error("Failed to fetch unclosed tickets", err);
    } finally {
      setLoading(false);
    }
  };

  const displayTotalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth 
      PaperProps={{ 
        style: { borderRadius: 12, overflow: 'hidden' } 
      }}
    >
      <DialogTitle className="flex justify-between items-center m-0 px-6 py-4 border-b border-slate-100 bg-white">
        <span className="text-[#e91e63] font-bold text-[15px] tracking-wide">Please don't forget to close these tickets.</span>
        <IconButton onClick={onClose} size="small" className="text-slate-400 hover:text-slate-600 bg-slate-50">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent className="p-0 bg-white overflow-hidden flex flex-col">
        <div className="flex-1 w-full relative">
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            paginationMode="server"
            sortingMode="server"
            sortModel={sortModel}
            onSortModelChange={(newModel) => setSortModel(newModel)}
            rowCount={totalCount}
            hideFooter={true} /* We use our custom pagination */
            disableRowSelectionOnClick
            disableColumnMenu
            autoHeight={true}
            getRowHeight={() => 'auto'}
            getEstimatedRowHeight={() => 45}
            columnHeaderHeight={65}
            sx={{
              border: 'none',
              '& .super-app-theme--header': {
                backgroundColor: '#ffffff',
                borderBottom: '2px solid #f1f5f9',
                cursor: 'pointer',
              },
              '& .MuiDataGrid-row': {
                borderBottom: '1px solid #f8fafc',
              },
              '& .MuiDataGrid-row:nth-of-type(even)': {
                backgroundColor: '#f8fafc',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: '#f1f5f9',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: 'none',
              },
              '& .MuiDataGrid-virtualScroller': {
                overflowX: 'auto !important',
                scrollbarWidth: 'thin !important',
                '&::-webkit-scrollbar': { 
                  display: 'block !important', 
                  width: '6px', 
                  height: '8px' 
                },
                '&::-webkit-scrollbar-track': { 
                  background: 'transparent' 
                },
                '&::-webkit-scrollbar-thumb': { 
                  background: '#cbd5e1', 
                  borderRadius: '10px' 
                },
                '&::-webkit-scrollbar-thumb:hover': { 
                  background: '#94a3b8' 
                }
              }
            }}
          />
        </div>

        {/* Custom Pagination Footer identical to ResourcePage */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page Size:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-3 h-7 text-[10px] font-black bg-white text-pink-600 border border-slate-200 rounded-lg outline-none transition-all cursor-pointer shadow-sm hover:border-pink-500/50 uppercase tracking-widest"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s} className="font-sans">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span className="text-slate-900 tabular-nums">
                  {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}
                </span>
                <span className="text-slate-400 mx-1.5">—</span>
                <span className="text-slate-900 tabular-nums">
                  {Math.min(page * pageSize, totalCount)}
                </span>
                <span className="text-slate-400 mx-2 lowercase font-bold tracking-normal italic">of</span>
                <span className="text-slate-900 tabular-nums font-black">
                  {totalCount}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-xl shadow-sm">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1 || loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="First Page"
                >
                  <ChevronsLeft size={14} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>

                <div className="h-6 w-px bg-slate-100 mx-1"></div>

                <div className="px-3 flex items-center gap-2 py-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page</span>
                  <div className="flex items-center gap-1.5 min-w-[40px] justify-center">
                    <span className="text-[11px] font-black text-pink-600 tabular-nums leading-none">{page}</span>
                    <span className="text-[10px] font-black text-slate-300">/</span>
                    <span className="text-[10px] font-black text-slate-500 tabular-nums leading-none">{displayTotalPages}</span>
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-100 mx-1"></div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= displayTotalPages || loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Next Page"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setPage(displayTotalPages)}
                  disabled={page >= displayTotalPages || loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Last Page"
                >
                  <ChevronsRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-1.5 text-[13px] font-medium rounded-md border border-[#818cf8] text-[#6366f1] hover:bg-[#6366f1]/5 transition-colors shadow-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
