import { useState } from "react";
import AppSelect from "../component/common/AppSelect";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import apiClient from "../services/apiClient";
import PremiumErrorAlert from "../component/common/PremiumErrorAlert";
import { useBackendLocalization } from "../hooks/useBackendLocalization";
import { getApiErrorMessage } from "../utils/apiError";

// Same year range as the Blazor page: current year and the previous 10 years.
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, index) => CURRENT_YEAR - index);

// Columns and header texts follow the Blazor page's Excel export
// (Blazor.Client/Pages/Reports/AMSTicketingUserYearlyReport.razor). Only "User"
// and "Year" have backend localization keys; the other header texts exist only there.
const REPORT_COLUMNS = [
  { field: "UserName", labelKey: "User" },
  { field: "MonthName", label: "Month" },
  { field: "Year", labelKey: "Year" },
  { field: "BilledOfficeHoursCost", label: "Billed_Office_Amount (MYR)", type: "cost" },
  { field: "BilledAfterOfficeHoursCost", label: "Billed_AfterOffice_Amount (MYR)", type: "cost" },
  { field: "BilledTotalAmount", label: "Billed_Total_Amount (MYR)", type: "cost" },
  { field: "NonBilledOfficeHoursCost", label: "NonBilled_Office_Amount (MYR)", type: "cost" },
  { field: "NonBilledAfterOfficeHoursCost", label: "NonBilled_AfterOffice_Amount (MYR)", type: "cost" },
  { field: "NonBilledTotalAmount", label: "NonBilled_Total_Amount (MYR)", type: "cost" },
  { field: "OfficeHoursCost", label: "Total_Office_Amount (MYR)", type: "cost" },
  { field: "AfterOfficeHoursCost", label: "Total_AfterOffice_Amount (MYR)", type: "cost" },
  { field: "TotalAmount", label: "Total_Amount (MYR)", type: "cost" },
  { field: "BilledOfficeHours", label: "Billed_Office_Hours (Hrs)", type: "hours" },
  { field: "BilledAfterOfficeHours", label: "Billed_AfterOffice_Hours (Hrs)", type: "hours" },
  { field: "BilledTotalHours", label: "Billed_Total_Hours (Hrs)", type: "hours" },
  { field: "NonBilledOfficeHours", label: "NonBilled_Office_Hours (Hrs)", type: "hours" },
  { field: "NonBilledAfterOfficeHours", label: "NonBilled_AfterOffice_Hours (Hrs)", type: "hours" },
  { field: "NonBilledTotalHours", label: "NonBilled_Total_Hours (Hrs)", type: "hours" },
  { field: "OfficeHours", label: "Total_Office_Hours (Hrs)", type: "hours" },
  { field: "AfterOfficeHours", label: "Total_After_Office_Hours (Hrs)", type: "hours" },
  { field: "TotalHours", label: "Total_Hours (Hrs)", type: "hours" },
];

// Compact on-screen widths (px); long headers wrap instead of widening the column.
const COLUMN_WIDTHS = { UserName: 130, MonthName: 80, Year: 52 };
const NUMBER_COLUMN_WIDTH = 84;
const getColumnWidth = (column) => COLUMN_WIDTHS[column.field] ?? NUMBER_COLUMN_WIDTH;
const TABLE_WIDTH = REPORT_COLUMNS.reduce((total, column) => total + getColumnWidth(column), 0);

// Lets headers such as "NonBilled_AfterOffice_Amount (MYR)" break after underscores
// without changing the visible text.
const withHeaderBreaks = (label) => label.replace(/_/g, "_​");

// Same number formats as the Blazor Excel export.
const EXCEL_NUMBER_FORMATS = { cost: "#,##0.00", hours: "0.00" };
const costFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// The API may camelCase the DTO property names, so match them case-insensitively.
const getRowValue = (row, field) => {
  if (!row) return undefined;
  const matchingKey = Object.keys(row).find(
    (key) => key.toLowerCase() === field.toLowerCase(),
  );
  return matchingKey ? row[matchingKey] : undefined;
};

const getCellValue = (row, column, year) =>
  column.field === "Year" ? year : getRowValue(row, column.field);

const formatCellValue = (value, type) => {
  if (value === null || value === undefined || value === "") return "-";
  const numericValue = Number(value);
  if (type === "cost" && Number.isFinite(numericValue)) return costFormatter.format(numericValue);
  if (type === "hours" && Number.isFinite(numericValue)) return numericValue.toFixed(2);
  return String(value);
};

// Blazor highlights grand total rows light green and user total rows light yellow.
const getTotalRowType = (row) => {
  if (getRowValue(row, "IsGrandTotal")) return "grand";
  if (getRowValue(row, "IsUserTotal")) return "user";
  return null;
};

const fetchYearlyReport = async (year) => {
  const response = await apiClient.get("/api/app/a-mSTicket/yearly-generation-each-user", {
    params: { year: Number(year) },
  });
  return Array.isArray(response.data) ? response.data : [];
};

export default function UserYearlyReportPage() {
  const navigate = useNavigate();
  const localize = useBackendLocalization("Billing");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [reportData, setReportData] = useState([]);
  const [reportYear, setReportYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const getColumnLabel = (column) =>
    column.labelKey ? localize(column.labelKey) : column.label;

  const validateYear = () => {
    if (year) return true;
    setFormError(
      localize("The {0} field is required.").replace("{0}", localize("Year")),
    );
    return false;
  };

  const handleClear = () => {
    setFormError("");
    setReportData([]);
    setReportYear("");
    setYear(String(CURRENT_YEAR));
  };

  const handleGetReport = async () => {
    setFormError("");
    if (!validateYear()) return;

    try {
      setLoading(true);
      const dataArray = await fetchYearlyReport(year);
      setReportData(dataArray);
      setReportYear(year);
      if (dataArray.length === 0) setFormError(localize("NoReportFound"));
    } catch (error) {
      console.error("Failed to get report:", error);
      setReportData([]);
      setFormError(getApiErrorMessage(error) || localize("DefaultErrorMessage"));
    } finally {
      setLoading(false);
    }
  };

  // Like Blazor, the Excel button loads the selected year itself.
  const handleExportExcel = async () => {
    setFormError("");
    if (!validateYear()) return;

    let results;
    try {
      setExcelLoading(true);
      results = reportYear === year && reportData.length > 0
        ? reportData
        : await fetchYearlyReport(year);
    } catch (error) {
      console.error("Failed to get report:", error);
      setFormError(getApiErrorMessage(error) || localize("DefaultErrorMessage"));
      setExcelLoading(false);
      return;
    }

    if (results.length === 0) {
      setFormError(localize("NoReportFound"));
      setExcelLoading(false);
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("TicketReport");
      const thinBorder = { style: "thin" };
      const cellBorder = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

      const headerRow = worksheet.addRow(REPORT_COLUMNS.map(getColumnLabel));
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };
        cell.border = cellBorder;
      });

      results.forEach((row) => {
        const excelRow = worksheet.addRow(
          REPORT_COLUMNS.map((column) => getCellValue(row, column, String(year)) ?? ""),
        );
        const totalRowType = getTotalRowType(row);

        REPORT_COLUMNS.forEach((column, index) => {
          const cell = excelRow.getCell(index + 1);
          cell.border = cellBorder;
          if (column.type) cell.numFmt = EXCEL_NUMBER_FORMATS[column.type];
          if (totalRowType) {
            cell.font = { bold: true };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: totalRowType === "grand" ? "FF90EE90" : "FFFFFFE0" },
            };
          }
        });
      });

      worksheet.columns.forEach((column, index) => {
        column.width = Math.max(getColumnLabel(REPORT_COLUMNS[index]).length + 2, 12);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `UserYearlyReport_${year}.xlsx`,
      );
    } catch (error) {
      console.error("Export failed:", error);
      setFormError(localize("DefaultErrorMessage"));
    } finally {
      setExcelLoading(false);
    }
  };

  const headerCellClass =
    "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-1.5 text-[9px] font-black uppercase text-slate-700 dark:text-slate-200 text-center align-middle leading-tight break-words";

  const totalRowClass = {
    grand: "bg-green-100 dark:bg-green-500/15 font-black",
    user: "bg-yellow-50 dark:bg-yellow-500/10 font-black",
  };

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
                <span className="text-pink-500 font-black">{localize("UserYearlyReport")}</span>
              </nav>
              <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                {localize("UserYearlyReport")}
                {(loading || excelLoading) && <span className="w-4 h-4 border-2 border-slate-800 dark:border-white border-t-transparent rounded-full animate-spin"></span>}
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

              <button
                onClick={handleExportExcel}
                disabled={excelLoading}
                className="app-primary-button flex items-center gap-2 px-3 py-1.5 text-[11px]"
              >
                {excelLoading ? localize("ProcessingWithThreeDot") : localize("GetExcelReport")}
              </button>
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
            <div className="max-h-[580px] overflow-auto">
              <table className="table-fixed border-collapse text-[11px]" style={{ width: TABLE_WIDTH }}>
                <colgroup>
                  {REPORT_COLUMNS.map((column) => (
                    <col key={column.field} style={{ width: getColumnWidth(column) }} />
                  ))}
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    {REPORT_COLUMNS.map((column) => (
                      <th key={column.field} className={headerCellClass}>
                        {withHeaderBreaks(getColumnLabel(column))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, rowIndex) => {
                    const totalRowType = getTotalRowType(row);
                    const rowClass = totalRowType
                      ? totalRowClass[totalRowType]
                      : rowIndex % 2 === 0
                        ? "bg-white dark:bg-[#161920] font-semibold"
                        : "bg-slate-50 dark:bg-white/[0.03] font-semibold";

                    return (
                      <tr key={`${getRowValue(row, "UserName")}-${getRowValue(row, "Month")}-${rowIndex}`} className={rowClass}>
                        {REPORT_COLUMNS.map((column) => (
                          <td
                            key={column.field}
                            className={`border border-slate-200 dark:border-slate-700 px-1.5 py-1.5 text-slate-800 dark:text-slate-100 tabular-nums text-center align-middle ${column.type ? "whitespace-nowrap" : "break-words"}`}
                          >
                            {formatCellValue(getCellValue(row, column, reportYear), column.type)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
