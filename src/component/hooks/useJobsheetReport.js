import { useState } from "react";
import apiClient from "../../services/apiClient";

export function useJobsheetReport() {
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const fetchReport = async (filters, asFile = true) => {
    setReportLoading(true);
    setReportError(null);
    setReportData(null);

    try {
      const params = {
        "JobsheetSearch.DateFrom": filters.dateFrom
          ? filters.dateFrom.includes("T")
            ? filters.dateFrom
            : `${filters.dateFrom}T00:00:00.000Z`
          : undefined,
        "JobsheetSearch.DateTo": filters.dateTo
          ? filters.dateTo.includes("T")
            ? filters.dateTo
            : `${filters.dateTo}T23:59:59.999Z`
          : undefined,
        "JobsheetSearch.ProjectIdSearchValue": filters.project || undefined,
        "JobsheetSearch.UserIdsSearchValues": filters.collaborator
          ? [filters.collaborator]
          : undefined,
      };

      const config = {
        params,
        responseType: "blob",
      };

      if (asFile) {
        config.headers = {
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf, application/json",
        };
      } else {
        config.headers = {
          Accept: "application/json",
        };
      }

      const response = await apiClient.get(
        "/api/app/jobsheet/jobsheet-report",
        config,
      );

      const contentType = response.headers["content-type"] || "";
      const isJson = contentType.includes("application/json");

      if (isJson) {
        const text = await response.data.text();
        const jsonData = JSON.parse(text);
        setReportData(jsonData);
      } else {
        const blob = new Blob([response.data], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        let fileName = "Jobsheet_Report";
        const contentDisposition = response.headers["content-disposition"];
        if (contentDisposition) {
          const fileNameMatch =
            contentDisposition.match(/filename="?([^"]+)"?/);
          if (fileNameMatch && fileNameMatch.length >= 2) {
            fileName = fileNameMatch[1];
          }
        } else {
          if (contentType.includes("pdf")) fileName += ".pdf";
          else if (contentType.includes("spreadsheetml")) fileName += ".xlsx";
          else if (contentType.includes("excel")) fileName += ".xls";
          else if (contentType.includes("csv")) fileName += ".csv";
        }

        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to fetch jobsheet report:", error);
      let errorMessage = "Failed to generate report.";

      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          errorMessage = errorData?.error?.message || errorMessage;
        } catch (e) {
          console.error("Could not parse blob error:", e);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setReportError(errorMessage);
    } finally {
      setReportLoading(false);
    }
  };

  return {
    reportData,
    reportLoading,
    reportError,
    fetchReport,
    clearReportData: () => setReportData(null),
    clearReportError: () => setReportError(null),
  };
}
