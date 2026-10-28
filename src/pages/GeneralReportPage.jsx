import { useState } from "react";
import AppSelect from "../component/common/AppSelect";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { buildReportFileName } from "../utils/reportFileName";
import apiClient from "../services/apiClient";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { useBackendLocalization } from "../hooks/useBackendLocalization";
import { getApiErrorMessage } from "../utils/apiError";

// Same year range as the Blazor page: current year and the previous 10 years.
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, index) => CURRENT_YEAR - index);

// Columns and header texts follow the backend report template
// (Blazor.Client/wwwroot/Reports/GeneralReport.mrt). Only "Year" has a backend
// localization key; the other header texts exist only in that template.
const REPORT_COLUMN_GROUPS = [
  { columns: [{ field: "Year", labelKey: "Year" }] },
  { columns: [{ field: "Month", label: "Month" }] },
  { columns: [{ field: "Total_Number_Of_Tickets", label: "Total Tickets" }] },
  {
    label: "Service Type",
    columns: [
      { field: "Service_Planned", label: "Planned" },
      { field: "Service_Demand", label: "Demand" },
    ],
  },
  {
    label: "Ticket Channels",
    columns: [
      { field: "Number_Of_Tickets_Forwarded_By_ITS", label: "ITS" },
      { field: "WhatsApp_Viber_Tickets", label: "WhatsApp/Viber" },
      { field: "Phone_Call_Tickets", label: "Hotline" },
      { field: "Email_Tickets", label: "Email" },
    ],
  },
  {
    label: "Ticket By Countries",
    columns: [
      { field: "Tickets_In_Malaysia", label: "Malaysia" },
      { field: "Tickets_In_Vietnam", label: "Vietnam" },
      { field: "Tickets_In_Philippines", label: "Philippines" },
      { field: "Tickets_In_Singapore", label: "Singapore" },
      { field: "Tickets_In_Australia", label: "Australia" },
      { field: "Tickets_In_Brunei", label: "Brunei" },
      { field: "Tickets_In_Hong_Kong", label: "Hong Kong" },
      { field: "Tickets_In_Indonesia", label: "Indonesia" },
      { field: "Tickets_In_United_Kingdom", label: "United Kingdom" },
    ],
  },
];
const REPORT_COLUMNS = REPORT_COLUMN_GROUPS.flatMap((group) => group.columns);

// The API may camelCase the DTO property names, so match them case-insensitively.
const getRowValue = (row, field) => {
  if (!row) return undefined;
  const matchingKey = Object.keys(row).find(
    (key) => key.toLowerCase() === field.toLowerCase(),
  );
  return matchingKey ? row[matchingKey] : undefined;
};

const formatCellValue = (value) =>
  value === null || value === undefined || value === "" ? "-" : String(value);

export default function GeneralReportPage() {
  const navigate = useNavigate();
  const localize = useBackendLocalization("Billing");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const getColumnLabel = (column) =>
    column.labelKey ? localize(column.labelKey) : column.label;

  const reportSummary = reportData[0];
  const generatedBy = getRowValue(reportSummary, "CurrentUser");
  const generatedOn = getRowValue(reportSummary, "CurrentDateTime");

  const handleClear = () => {
    setFormError("");
    setReportData([]);
    setYear(String(CURRENT_YEAR));
  };

  const handleGetReport = async () => {
    setFormError("");

    if (!year) {
      setFormError(
        localize("The {0} field is required.").replace("{0}", localize("Year")),
      );
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get("/api/app/report/general-report", {
        params: { year: Number(year) },
      });
      const dataArray = Array.isArray(response.data) ? response.data : [];

      setReportData(dataArray);
      if (dataArray.length === 0) setFormError(localize("NoReportFound"));
    } catch (error) {
      console.error("Failed to get report:", error);
      setReportData([]);
      setFormError(getApiErrorMessage(error) || localize("DefaultErrorMessage"));
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) {
      setFormError(localize("NoReportFound"));
      return;
    }

    try {
      setExcelLoading(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(localize("GeneralReport") || "GeneralReport");
      const headerFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDB2777" },
      };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" } };

      // Two header rows, like the backend template: group titles, then columns.
      const groupRow = worksheet.addRow([]);
      const columnRow = worksheet.addRow(REPORT_COLUMNS.map(getColumnLabel));
      let columnIndex = 1;
      REPORT_COLUMN_GROUPS.forEach((group) => {
        const lastIndex = columnIndex + group.columns.length - 1;
        if (group.label) {
          groupRow.getCell(columnIndex).value = group.label;
          if (lastIndex > columnIndex) {
            worksheet.mergeCells(1, columnIndex, 1, lastIndex);
          }
        } else {
          groupRow.getCell(columnIndex).value = getColumnLabel(group.columns[0]);
          worksheet.mergeCells(1, columnIndex, 2, columnIndex);
        }
        columnIndex = lastIndex + 1;
      });

      [groupRow, columnRow].forEach((row) => {
        for (let index = 1; index <= REPORT_COLUMNS.length; index += 1) {
          const cell = row.getCell(index);
          cell.fill = headerFill;
          cell.font = headerFont;
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        }
      });

      reportData.forEach((row) => {
        worksheet.addRow(REPORT_COLUMNS.map((column) => getRowValue(row, column.field) ?? ""));
      });

      worksheet.addRow([]);
      if (generatedBy) worksheet.addRow([`Generated By : ${generatedBy}`]);
      if (generatedOn) worksheet.addRow([`Generated On : ${generatedOn}`]);

      worksheet.columns.forEach((column, index) => {
        column.width = index === 1 ? 14 : 12;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        buildReportFileName("GeneralReport"),
      );
    } catch (error) {
      console.error("Export failed:", error);
      setFormError(localize("DefaultErrorMessage"));
    } finally {
      setExcelLoading(false);
    }
  };

  const headerCellClass =
    "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-[10px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 text-center align-middle leading-tight";

  return (
    <div className="min-h-full w-full bg-[#f8fafc] dark:bg-slate-950 p-1 pb-[10px] flex flex-col relative overflow-visible font-[Arial] text-slate-900 dark:text-white">
      <div className="flex-1 w-full bg-white dark:bg-[#161920] border border-slate-200 dark:border-slate-800/50 shadow-sm flex flex-col rounded-3xl">
        {/* Header */}
        <div className="app-page-header flex flex-col gap-6 py-8 px-4 md:px-8 transition-colors border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <nav className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600 mb-1">
                <span onClick={() => navigate("/")} className="hover:opacity-80 cursor-pointer transition-all hover:text-pink-500">
                  {localize("Home")}
                </span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span>{localize("Permission:Reports")}</span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <span className="text-pink-500 font-black">{localize("GeneralReport")}</span>
              </nav>
              <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                {localize("GeneralReport")}
                {loading && <span className="w-4 h-4 border-2 border-slate-800 dark:border-white border-t-transparent rounded-full animate-spin"></span>}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold hover:border-slate-400 dark:hover:border-slate-500 transition-all active:scale-95 shadow-sm text-slate-700 dark:text-slate-300"
              >
                {localize("Clear")}
              </button>

              <button
                onClick={handleGetReport}
                disabled={loading}
                className="app-primary-button flex items-center gap-2 px-4 py-1.5 text-[11px]"
              >
                {loading ? localize("LoadingWithThreeDot") : localize("GetReport")}
              </button>

              {reportData.length > 0 && (
                <button
                  onClick={handleExportExcel}
                  disabled={excelLoading}
                  className="app-primary-button flex items-center gap-2 px-3 py-1.5 text-[11px]"
                >
                  {excelLoading ? localize("ProcessingWithThreeDot") : localize("GetExcelReport")}
                </button>
              )}
            </div>
          </div>

          {/* Filter Section */}
          <div className="w-full sm:w-48">
            <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
              {localize("Year")}
            </label>
            <AppSelect
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full h-[36px] text-xs font-semibold"
            >
              {YEAR_OPTIONS.map((optionYear) => (
                <option key={optionYear} value={optionYear}>{optionYear}</option>
              ))}
            </AppSelect>
          </div>
        </div>

        {/* Report */}
        <div className="flex-1 flex flex-col relative p-4 h-auto w-full">
          {formError && (
            <div className="mb-4">
              <PremiumErrorAlert open={!!formError} message={formError} onClose={() => setFormError("")} />
            </div>
          )}

          {reportData.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="max-h-[580px] overflow-auto">
                <table className="w-full min-w-max border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {REPORT_COLUMN_GROUPS.map((group) =>
                        group.label ? (
                          <th key={group.label} colSpan={group.columns.length} className={headerCellClass}>
                            {group.label}
                          </th>
                        ) : (
                          <th key={group.columns[0].field} rowSpan={2} className={headerCellClass}>
                            {getColumnLabel(group.columns[0])}
                          </th>
                        ),
                      )}
                    </tr>
                    <tr>
                      {REPORT_COLUMN_GROUPS.filter((group) => group.label).flatMap((group) =>
                        group.columns.map((column) => (
                          <th key={column.field} className={headerCellClass}>
                            {getColumnLabel(column)}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, rowIndex) => (
                      <tr
                        key={`${getRowValue(row, "Year")}-${getRowValue(row, "MonthNumber") ?? rowIndex}`}
                        className={rowIndex % 2 === 0 ? "bg-white dark:bg-[#161920]" : "bg-slate-50 dark:bg-white/[0.03]"}
                      >
                        {REPORT_COLUMNS.map((column) => (
                          <td
                            key={column.field}
                            className={`border border-slate-200 dark:border-slate-700 px-2 py-2 font-semibold text-slate-800 dark:text-slate-100 tabular-nums ${column.field === "Month" ? "text-left" : "text-center"}`}
                          >
                            {formatCellValue(getRowValue(row, column.field))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(generatedBy || generatedOn) && (
                <div className="flex flex-col text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {generatedBy && <span>Generated By : {generatedBy}</span>}
                  {generatedOn && <span>Generated On : {generatedOn}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
