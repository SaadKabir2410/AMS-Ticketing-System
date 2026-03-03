/**
 * DB.js — Real API Integration
 * This file replaces the simulated localStorage DB with real network calls.
 */
import axios from 'axios';

// Use the Vite dev proxy (/api → https://sureze.ddns.net:3333)
// so all requests go through localhost and CORS/SSL is handled by the proxy.
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    '/api/app/';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Attach the auth token to every request automatically.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});
// Handle 401 / 403 globally — only log out when a token IS present
// (meaning it's genuinely expired/invalid), NOT when a write request
// (POST/PUT/DELETE) fails simply because there's no token yet.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            const token = localStorage.getItem('auth_token');
            const status = error.response.status;
            const method = error.config?.method?.toUpperCase();
            const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

            console.warn(
                `[Auth] ${status} on ${method} ${error.config?.url}. ` +
                `Token present: ${!!token}. Is mutation: ${isMutation}.`
            );

            // Only clear session on 401 (Unauthorized) — 403 means "Forbidden/No Permission"
            // but the session itself might still be valid.
            if (status === 401 && token && !isMutation) {
                console.warn('[Auth] Token expired (401) — clearing session and redirecting to login.');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('spike_session');
                window.dispatchEvent(new CustomEvent('auth:expired'));
            } else if (status === 403) {
                console.warn('[Auth] 403 Forbidden — You may not have permission for this action/resource.');
            } else if (!token) {
                console.warn('[Auth] No token found — request unauthorized. Please log in.');
            }
        }
        return Promise.reject(error);
    }
);


// The Database Connector
const DB = {
    // ── Tickets ──────────────────────────────────────────────────────────────
    tickets: {
        getAll: ({
            page = 1,
            perPage = 10,
            search,
            sortKey,
            sortDir = 'desc',
            columnFilter,
            filterOperator
        } = {}) => {
            const operatorMap = {
                contains: 'Contains',
                equals: 'Equals',
                startsWith: 'StartsWith'
            };
            const backendOperator = operatorMap[filterOperator] || 'Contains';

            const columnFilterParamMap = {
                id: 'TicketSearch.Id',
                subject: 'TicketSearch.Subject',
                status: 'TicketSearch.Status',
                assigneeName: 'TicketSearch.AssigneeName',
                siteName: 'TicketSearch.SiteName',
            };

            let ticketSearchParams = {};
            if (columnFilter?.value && columnFilterParamMap[columnFilter.field]) {
                const backendParam = columnFilterParamMap[columnFilter.field];
                const { value, operator } = columnFilter;
                const op = operatorMap[operator] || backendOperator;

                ticketSearchParams = {
                    [backendParam]: value,
                    [`${backendParam}Operator`]: op,
                };
            }

            const apiParams = {
                SkipCount: (page - 1) * perPage,
                skipCount: (page - 1) * perPage,
                MaxResultCount: perPage,
                maxResultCount: perPage,
                Filter: search || undefined,
                FilterOperator: backendOperator,
                ...ticketSearchParams,
                Sorting: sortKey ? (sortKey === 'id' ? 'CreationTime desc' : `${sortKey} ${sortDir}`) : 'CreationTime desc'
            };
            console.log('--- API CALL: ams/tickets ---', apiParams);
            return api.get('ams/tickets', { params: apiParams }).then(r => r.data);
        },
        getById: (id) => api.get(`tickets/${id}`).then(r => r.data),
        create: (data) => api.post('tickets', data).then(r => r.data),
        update: (id, data) => api.put(`tickets/${id}`, data).then(r => r.data),
        delete: (id) => api.delete(`tickets/${id}`).then(r => r.data),
        getStats: () => api.get('tickets/stats').then(r => r.data),
    },

    // ── Sites ─────────────────────────────────────────────────────────────────
    sites: {
        getAll: ({
            page = 1,
            perPage = 10,
            search,
            sortKey,
            sortDir = 'desc',
            columnFilter,
            filterOperator
        } = {}) => {
            const operatorMap = {
                contains: 'Contains',
                equals: 'Equals',
                startsWith: 'StartsWith'
            };
            const backendOperator = operatorMap[filterOperator] || 'Contains';

            const sortFieldMap = {
                id: 'Id',
                name: 'Name',
                ocn: 'OCN',
                countryName: 'Country.Name',
                address: 'Address',
            };
            const backendSortField = sortFieldMap[sortKey] || 'Id';

            const columnFilterParamMap = {
                name: 'SiteSearch.Name',
                ocn: 'SiteSearch.OCN',
                countryName: 'SiteSearch.CountryName',
                address: 'SiteSearch.Address',
            };

            let siteSearchParams = {};
            if (columnFilter?.value && columnFilterParamMap[columnFilter.field]) {
                const backendParam = columnFilterParamMap[columnFilter.field];
                const { value, operator } = columnFilter;
                const op = operatorMap[operator] || backendOperator;

                siteSearchParams = {
                    [backendParam]: value,
                    [`${backendParam}Operator`]: op,
                };
            }

            const apiParams = {
                SkipCount: (page - 1) * perPage,
                skipCount: (page - 1) * perPage,
                MaxResultCount: perPage,
                maxResultCount: perPage,
                Filter: search || undefined,
                FilterOperator: backendOperator,
                ...siteSearchParams,
                Sorting: `${backendSortField} ${sortDir}`
            };
            console.log('--- API CALL: site/paged-list ---', apiParams);
            return api.get('site/paged-list', { params: apiParams }).then(r => r.data);
        },
        checkOcnExists: (ocn, signal) => api.get('site/paged-list', {
            params: {
                SkipCount: 0,
                MaxResultCount: 1,
                'SiteSearch.OCN': ocn,
                'SiteSearch.OCNOperator': 'Equals',
                Sorting: 'Name asc',
            },
            signal,
        }).then(r => r.data),
        getById: (id) => api.get(`site/${id}/by-id`).then(r => r.data),
        create: (data) => api.post('site', data).then(r => r.data),
        update: (id, data) => api.put(`site/${id}`, data).then(r => r.data),
        delete: (id) => api.delete(`site/${id}`).then(r => r.data),
    },

    // ── Countries ─────────────────────────────────────────────────────────────
    countries: {
        getAll: () => api.get('country').then(r => r.data),
        create: (data) => api.post('country', data).then(r => r.data),
        update: (id, data) => api.put(`country/${id}`, data).then(r => r.data),
        delete: (id) => api.delete(`country/${id}`).then(r => r.data),
    },

    // ── Audit Logs ────────────────────────────────────────────────────────────
    auditLogs: {
        id: 'auditLogs',
        getAll: ({
            page = 1,
            perPage = 10,
            search,
            sortKey,
            sortDir = 'desc',
            columnFilter,
            filterOperator,
            ...extraParams
        } = {}) => {
            const columnFilterParamMap = {
                primaryKey: 'AuditedLogSearch.PrimaryKey',
                entityName: 'AuditedLogSearch.EntityName',
                userName: 'AuditedLogSearch.UserName',
                schemaName: 'AuditedLogSearch.SchemaName',
                tableName: 'AuditedLogSearch.TableName',
                serviceName: 'AuditedLogSearch.ServiceName',
                userId: 'AuditedLogSearch.UserId',
                fromDate: 'AuditedLogSearch.FromDate',
                toDate: 'AuditedLogSearch.ToDate',
                operationType: 'AuditedLogSearch.OperationType',
                countryName: 'AuditedLogSearch.CountryName',
            };

            let searchParams = {};

            // Global search → maps to EntityName
            if (search) {
                searchParams['AuditedLogSearch.EntityName'] = search;
            }

            // Explicitly map keys from extraParams using the map if they exist
            Object.keys(extraParams).forEach(key => {
                if (extraParams[key] !== undefined && extraParams[key] !== null) {
                    const mappedKey = columnFilterParamMap[key] || key;
                    searchParams[mappedKey] = extraParams[key];
                }
            });

            // Handle sorting key mapping
            const sortFieldMap = {
                operationType: 'OperationType',
                primaryKey: 'PrimaryKey',
                entityName: 'EntityName',
                schemaName: 'SchemaName',
                userName: 'UserName',
                dateTime: 'DateTime'
            };
            const backendSortField = sortFieldMap[sortKey] || 'DateTime';
            const dir = sortDir === 'asc' ? 'Asc' : 'Desc';
            const sorting = `${backendSortField} ${dir}`;

            const apiParams = {
                SkipCount: (page - 1) * perPage,
                skipCount: (page - 1) * perPage,
                MaxResultCount: perPage,
                maxResultCount: perPage,
                Sorting: sorting,
                ...searchParams,
            };

            console.log('--- API CALL: audited-log/paged-list ---', apiParams);

            const sp = new URLSearchParams();
            Object.keys(apiParams).forEach(k => {
                if (apiParams[k] !== undefined && apiParams[k] !== null) {
                    sp.append(k, apiParams[k]);
                }
            });

            return api.get('audited-log/paged-list', {
                params: sp,
                paramsSerializer: (p) => p.toString()
            }).then(r => {
                const data = r.data || {};
                if (data.items) {
                    const requestedType = extraParams.operationType;
                    data.items = data.items.filter(item => {
                        // 1. Skip null/invalid records
                        if (!item) return false;

                        // 2. Hide Deletes (Type 3) to focus on Create/Update "default" data
                        if (item.operationType === 3) return false;

                        // 3. Determine Data State based on old values
                        const hasOld = (item.oldValuesDic && Object.keys(item.oldValuesDic).length > 0) ||
                            (item.oldValues && item.oldValues !== '{}' && item.oldValues !== 'null');

                        // 4. Apply Filter according to enums: 1=Create, 2=Update
                        if (requestedType == 1) return !hasOld; // CREATE
                        if (requestedType == 2) return hasOld;  // UPDATE

                        return true;
                    });
                }
                return data;
            }).catch(err => {
                console.error('Audit Log Error:', err.response?.data || err.message);
                throw err;
            });
        }
    },
}; // ← DB object ends here

// ── UI Dropdown Constants ──────────────────────────────────────────────────
const SITES = [
    'NHSBT FILTON (MSC)', 'PENANG ADVENTIST HOSPITAL (PAH)',
    'WILLIAM HARVEY HPL(MSC)', 'CHARING CROSS HOSPITAL',
    'GLASGOW ROYAL INFIRMARY', 'ST PETERS HOSPITAL',
    'SUNWAY MEDICAL CENTRE IPOH SDN BHD', 'JAMES PAGET HOSPITAL (ABB MSC)',
    'ALDER HEY CHILDRENS HOSPITAL(LIVERPOOL)', 'ABERDEEN ROYAL INFIRMARY',
    'ROYAL VICTORIA HOSPITAL', 'MANCHESTER ROYAL INFIRMARY',
    'LEEDS GENERAL INFIRMARY', 'KING COLLEGE HOSPITAL',
    "GUY'S AND ST THOMAS'", 'NORTHAMPTON GENERAL HOSPITAL',
];

const OCNS = [
    'OCE00791_001', 'OCN04212-801-00', 'OCE00481_010',
    'OCE00005_028', 'OCE00210_037', 'AAS356',
    'OCN05006-801-00', 'OCN01641-801-00', 'OCE00683-000', 'OCN02294-801-00',
];

const ASSIGNEES = ['Rukesh', 'Wahida', 'Abdul_Karem', 'Saad', 'Priya', 'Chen Wei'];
const STATUSES = ['Open', 'In Progress', 'Closed'];

export { DB, SITES, OCNS, ASSIGNEES, STATUSES };