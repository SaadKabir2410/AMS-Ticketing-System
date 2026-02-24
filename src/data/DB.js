/**
 * DB.js — Real API Integration
 * This file replaces the simulated localStorage DB with real network calls.
 */
import axios from 'axios';

// 1. Set up your API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://your-backend-api.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Uncomment if using tokens
    }
});



// The Database Connector
const DB = {
    // ── Tickets ──────────────────────────────────────────────────────────────
    tickets: {
        getAll: (params) => api.get('/tickets', { params }).then(r => r.data),
        getById: (id) => api.get(`/tickets/${id}`).then(r => r.data),
        create: (data) => api.post('/tickets', data).then(r => r.data),
        update: (id, data) => api.put(`/tickets/${id}`, data).then(r => r.data),
        delete: (id) => api.delete(`/tickets/${id}`).then(r => r.data),
        getStats: () => api.get('/tickets/stats').then(r => r.data),
        async getAll(params = {}) {
            const response = await api.get('/tickets', { params });
            return response.data;
        },

        async getById(id) {
            const response = await api.get(`/tickets/${id}`);
            return response.data;
        },

        async create(payload) {
            const response = await api.post('/tickets', payload);
            return response.data;
        },

        async update(id, payload) {
            const response = await api.put(`/tickets/${id}`, payload);
            return response.data;
        },

        async delete(id) {
            const response = await api.delete(`/tickets/${id}`);
            return response.data; // Usually returns true or { success: true }
        },

        async getStats() {
            const response = await api.get('/tickets/stats');
            return response.data;
        },
    },
    sites: {
        getAll: (params) => api.get('/sites', { params }).then(r => r.data),
        getById: (id) => api.get(`/sites/${id}`).then(r => r.data),
        create: (data) => api.post('/sites', data).then(r => r.data),
        update: (id, data) => api.put(`/sites/${id}`, data).then(r => r.data),
        delete: (id) => api.delete(`/sites/${id}`).then(r => r.data),
    }
};

// ── UI Dropdown Constants ──────────────────────────────────────────────────
// You can keep these here for now, or fetch them from a lookup API later.
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