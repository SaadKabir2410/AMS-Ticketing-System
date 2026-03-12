import { ticketsApi } from "../services/api/tickets";
import { sitesApi } from "../services/api/sites";
import { countriesApi } from "../services/api/countries";
import { workCodesApi } from "../services/api/workCodes";
import { holidaysApi } from "../services/api/holidays";
import { workingHoursApi } from "../services/api/workingHours";
import { jobsheetsApi } from "../services/api/jobsheets";
import { usersApi } from "../services/api/users";
import { rolesApi } from "../services/api/roles";
import { auditLogsApi } from "../services/api/auditLogs";
import apiClient from "../services/apiClient";

const DB = {
  tickets: ticketsApi,
  sites: sitesApi,
  countries: countriesApi,
  workCodes: workCodesApi,
  holidays: holidaysApi,
  workingHours: workingHoursApi,
  jobsheets: jobsheetsApi,
  users: usersApi,
  roles: rolesApi,
  auditLogs: auditLogsApi,
};

// ── UI Dropdown Constants ──────────────────────────────────────────────────
export const ASSIGNEES = [
  "Ahmad Jamil",
  "Saad Kabir",
  "Kareem Sureze",
  "System Admin",
  "John Doe",
];
export const STATUSES = ["Open", "In Progress", "Closed"];
export const OCNS = ["1001", "1002", "1003", "1004", "1005"];
export const SITES = [
  "NHSBT FILTON (MSC)",
  "PENANG ADVENTIST HOSPITAL (PAH)",
  "WILLIAM HARVEY HPL(MSC)",
  "CHARING CROSS HOSPITAL",
  "GLASGOW ROYAL INFIRMARY",
  "ST PETERS HOSPITAL",
  "SUNWAY MEDICAL CENTRE IPOH SDN BHD",
  "JAMES PAGET HOSPITAL (ABB MSC)",
  "ALDER HEY CHILDRENS HOSPITAL(LIVERPOOL)",
  "ABERDEEN ROYAL INFIRMARY",
  "ROYAL VICTORIA HOSPITAL",
  "MANCHESTER ROYAL INFIRMARY",
];

export { DB, apiClient };
export default DB;
