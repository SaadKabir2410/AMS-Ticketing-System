import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("AMS Ticket Tests");
sheet.showGridLines = false;
sheet.tabColor = "#BE185D";

const cases = [
  ["AMS Ticket", 1, "Open the AMS Ticket page with an authorized user.", "The page loads without errors and displays the ticket list, page title, search, filters, and permitted actions.", "", "", "", ""],
  ["AMS Ticket", 2, "Open the page with users who have and do not have create permission.", "The Create AMS Ticket action is visible and usable only for users with the required permission.", "", "", "", ""],
  ["AMS Ticket", 3, "Enter a known ticket value in the global Search field.", "The list refreshes to show only records matching the search text.", "", "", "", ""],
  ["AMS Ticket", 4, "Enter search text, then use the clear-search control.", "The search value is removed and the unfiltered ticket list is restored.", "", "", "", ""],
  ["AMS Ticket", 5, "Open and close the advanced Filters section.", "The filter panel toggles without losing the current list state or causing a page error.", "", "", "", ""],
  ["AMS Ticket", 6, "Filter tickets by Site Name.", "Only tickets matching the selected or entered site name are displayed.", "", "", "", ""],
  ["AMS Ticket", 7, "Filter tickets by Site OCN.", "Only tickets matching the Site OCN are displayed.", "", "", "", ""],
  ["AMS Ticket", 8, "Filter by CMS Next Ticket Number using a known ticket number.", "The matching ticket is returned and unrelated tickets are excluded.", "", "", "", ""],
  ["AMS Ticket", 9, "Filter by Ticket Received Date.", "Only tickets within the selected date criteria are displayed.", "", "", "", ""],
  ["AMS Ticket", 10, "Apply Ticket Closed By and Created By filters.", "The result set respects both user-based filters and returns the correct records.", "", "", "", ""],
  ["AMS Ticket", 11, "Apply multiple filters, then select Clear Filters.", "All filter values are reset and the default ticket list is loaded.", "", "", "", ""],
  ["AMS Ticket", 12, "Select sortable column headers in ascending and descending order.", "Rows are sorted by the selected column and the active sort direction is shown.", "", "", "", ""],
  ["AMS Ticket", 13, "Use First, Previous, Next, and Last pagination controls.", "Each control opens the correct page; unavailable controls are disabled at the boundaries.", "", "", "", ""],
  ["AMS Ticket", 14, "Open a ticket from the list in view mode.", "The complete saved ticket information and activities are displayed without enabling unauthorized edits.", "", "", "", ""],
  ["AMS Ticket", 15, "Open Create AMS Ticket and submit without mandatory values.", "The ticket is not saved and clear validation messages appear for every required field.", "", "", "", ""],
  ["AMS Ticket", 16, "Create a ticket with valid mandatory and optional information.", "The ticket is saved once, the dialog closes successfully, and the new ticket appears in the list.", "", "", "", ""],
  ["AMS Ticket", 17, "Upload a valid PDF through the ticket form.", "The PDF is accepted, processed, and shown in the attachment area without losing entered form data.", "", "", "", ""],
  ["AMS Ticket", 18, "Remove an uploaded attachment before saving.", "The selected attachment is removed and is not submitted with the ticket.", "", "", "", ""],
  ["AMS Ticket", 19, "Create a new Site from the ticket form and select it.", "The site is saved, becomes available for selection, and is applied to the ticket.", "", "", "", ""],
  ["AMS Ticket", 20, "Create a new Customer from the ticket form with valid contact data.", "The customer is saved, becomes available for selection, and is applied to the ticket.", "", "", "", ""],
  ["AMS Ticket", 21, "Change Ticket Type to Service Planned and then to another type.", "Service Planned Type appears only for Service Planned and is cleared or hidden for other ticket types.", "", "", "", ""],
  ["AMS Ticket", 22, "Enable Ticket Forwarded By and enter the conditional forwarding details.", "The related fields appear, required email validation is enforced, and valid forwarding data is saved.", "", "", "", ""],
  ["AMS Ticket", 23, "Add a valid activity with start/end time, activity type, performer, and work code.", "The activity is added to the activity table and its duration contributes to Total Duration.", "", "", "", ""],
  ["AMS Ticket", 24, "Edit an existing activity and save the changes.", "The updated activity values are shown once and Total Duration is recalculated correctly.", "", "", "", ""],
  ["AMS Ticket", 25, "Delete an activity from the ticket form.", "The activity is removed and Total Duration is recalculated without including the deleted entry.", "", "", "", ""],
  ["AMS Ticket", 26, "Add an activity with invalid dates, end before start, or an overlapping interval.", "The invalid activity is rejected and a clear warning identifies the date or overlap problem.", "", "", "", ""],
  ["AMS Ticket", 27, "Edit an existing open ticket and save changed ticket details.", "Changes persist after reload and unchanged fields and existing activities remain intact.", "", "", "", ""],
  ["AMS Ticket", 28, "Use the Update Data action for an eligible ticket.", "The latest ticket data is retrieved or updated successfully and the list reflects the result.", "", "", "", ""],
  ["AMS Ticket", 29, "Close a ticket without required closure data, then provide valid closure data.", "Missing resolution verification and closure fields are validated; valid data changes the ticket to Closed.", "", "", "", ""],
  ["AMS Ticket", 30, "Void an eligible ticket and confirm the action.", "The ticket status changes to Void and the list/actions update consistently.", "", "", "", ""],
  ["AMS Ticket", 31, "Reopen an eligible closed or void ticket and confirm the action.", "The ticket returns to the appropriate open state and edit actions become available as permitted.", "", "", "", ""],
  ["AMS Ticket", 32, "Open Audit Log from a ticket row.", "The audit view opens for the selected ticket and shows the relevant change history.", "", "", "", ""],
  ["AMS Ticket", 33, "Change the application language and revisit the AMS Ticket page and dialog.", "Available labels, buttons, validation messages, and menu text use the selected localization resources.", "", "", "", ""],
  ["AMS Ticket", 34, "Use the page and ticket dialog in light and dark themes at desktop and narrow widths.", "Content remains readable, controls remain usable, and tables/dialogs do not overlap or hide required actions.", "", "", "", ""],
  ["AMS Ticket", 35, "Simulate a failed or unauthorized list, create, update, or status-change request.", "The UI stops loading, displays the backend or localized error, and does not show a false success state.", "", "", "", ""],
  ["AMS Ticket", 36, "Refresh the page after creating or updating a ticket.", "Persisted ticket data reloads correctly from the backend and no duplicate record is introduced.", "", "", "", ""],
];

sheet.getRange("A2").values = [["AMS Ticket Application Test Report"]];
sheet.getRange("A2").format.font = { name: "Arial", size: 16, bold: true, color: "#111827" };
sheet.getRange("A3").values = [["Reconstructed from the current AMS Ticket implementation. Complete Actual Result, Status, Remarks, and Date during test execution."]];
sheet.getRange("A3:H3").format.font = { name: "Arial", size: 10, italic: true, color: "#64748B" };
sheet.getRange("A3:H3").format.borders = { bottom: { style: "thin", color: "#CBD5E1" } };

const endRow = 5 + cases.length;
sheet.getRange("A5:H5").values = [["Module(Pages)", "No.", "Test Case", "Expected Result", "Actual Result", "Status(Pass/Fail)", "Remarks", "Date"]];
sheet.getRange(`A6:H${endRow}`).values = cases;
const table = sheet.tables.add(`A5:H${endRow}`, true, "AMSTicketTestReport");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

sheet.getRange("A5:H5").format = {
  fill: "#9D174D",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#FFFFFF" },
};
sheet.getRange(`A6:H${endRow}`).format.font = { name: "Arial", size: 10, color: "#1F2937" };
sheet.getRange(`A6:H${endRow}`).format.verticalAlignment = "top";
sheet.getRange(`A6:H${endRow}`).format.wrapText = true;
sheet.getRange(`B6:B${endRow}`).format.horizontalAlignment = "center";
sheet.getRange(`F6:F${endRow}`).format.horizontalAlignment = "center";
sheet.getRange(`H6:H${endRow}`).format.horizontalAlignment = "center";
sheet.getRange(`E6:H${endRow}`).format.fill = "#FFFBEB";
sheet.getRange(`F6:F${endRow}`).dataValidation = { rule: { type: "list", values: ["Pass", "Fail"] } };
sheet.getRange(`H6:H${endRow}`).setNumberFormat("dd-mmm-yyyy");
sheet.getRange(`F6:F${endRow}`).conditionalFormats.add("containsText", { text: "Pass", format: { fill: "#DCFCE7", font: { color: "#166534", bold: true } } });
sheet.getRange(`F6:F${endRow}`).conditionalFormats.add("containsText", { text: "Fail", format: { fill: "#FEE2E2", font: { color: "#991B1B", bold: true } } });

sheet.getRange("J2").values = [["Execution Summary"]];
sheet.getRange("J2:K2").format = { fill: "#334155", font: { name: "Arial", size: 11, bold: true, color: "#FFFFFF" } };
sheet.getRange("J3:J6").values = [["Total cases"], ["Passed"], ["Failed"], ["Not executed"]];
sheet.getRange("K3").formulas = [[`=COUNTA(B6:B${endRow})`]];
sheet.getRange("K4").formulas = [[`=COUNTIF(F6:F${endRow},"Pass")`]];
sheet.getRange("K5").formulas = [[`=COUNTIF(F6:F${endRow},"Fail")`]];
sheet.getRange("K6").formulas = [["=K3-K4-K5"]];
sheet.getRange("J3:K6").format.font = { name: "Arial", size: 10, color: "#1F2937" };
sheet.getRange("J3:K6").format.borders = { preset: "all", style: "thin", color: "#CBD5E1" };
sheet.getRange("K3:K6").format.horizontalAlignment = "center";

const widths = { A: 18, B: 8, C: 48, D: 52, E: 42, F: 18, G: 32, H: 15, I: 3, J: 18, K: 14 };
for (const [column, width] of Object.entries(widths)) sheet.getRange(`${column}:${column}`).format.columnWidth = width;
sheet.getRange("2:2").format.rowHeight = 24;
sheet.getRange("3:3").format.rowHeight = 30;
sheet.getRange("5:5").format.rowHeight = 30;
sheet.getRange(`6:${endRow}`).format.rowHeight = 58;
sheet.freezePanes.freezeRows(5);
sheet.freezePanes.freezeColumns(2);

workbook.recalculate();
const inspection = await workbook.inspect({
  kind: "table",
  range: "AMS Ticket Tests!A2:K12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 11,
  maxChars: 8000,
});
console.log(inspection.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const outputDir = "E:/OFFICE/Development/Office Project/amsTicketing_application/outputs/ams_ticket_test_report";
await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: "AMS Ticket Tests", range: "A1:K18", scale: 1.2, format: "png" });
await fs.writeFile(`${outputDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/AMS_Ticket_Test_Report.xlsx`);
console.log(JSON.stringify({ output: `${outputDir}/AMS_Ticket_Test_Report.xlsx`, preview: `${outputDir}/preview.png`, rows: cases.length, endRow }));
