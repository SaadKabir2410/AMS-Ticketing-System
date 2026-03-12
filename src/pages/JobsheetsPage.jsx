import { useState, useMemo } from 'react';
import ResourcePage from '../component/common/ResourcePage';
import { jobsheetsApi } from '../services/api/jobsheets';
import { Download, RotateCcw } from 'lucide-react';

const PROJECTS = ['AMS central Monitoring', 'LIS', 'Others', 'AMS Internal'];

export default function JobsheetsPage() {
    const [filters, setFilters] = useState({
        project: '',
        dateFrom: '',
        dateTo: '',
        collaborator: ''
    });

    const handleClear = () => {
        setFilters({ project: '', dateFrom: '', dateTo: '', collaborator: '' });
    };

    const columns = useMemo(() => [
        {
            key: 'date',
            label: 'DATE',
            render: (val) => {
                if (!val) return '—';
                const d = new Date(val);
                return (
                    <span className="font-bold text-slate-800 dark:text-white uppercase">
                        {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                );
            }
        },
        {
            key: 'attendanceStatus',
            label: 'ATTENDANCE STATUS',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${val === 'Present' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:border-green-500/20' :
                    val === 'Absent' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:border-red-500/20' :
                        'bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:border-white/10'
                    }`}>
                    {val || '—'}
                </span>
            )
        },
        {
            key: 'createdBy',
            label: 'CREATED BY',
            render: (val) => <span className="text-slate-600 dark:text-slate-300 font-medium text-sm">{val || '—'}</span>
        },
        {
            key: 'totalDurationHours',
            label: 'TOTAL DURATION (HOURS)',
            render: (val) => <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">{val ?? '—'}</span>
        },
        {
            key: 'totalDurationMinutes',
            label: 'TOTAL DURATION (MINUTES)',
            render: (val) => <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">{val ?? '—'}</span>
        },
        {
            key: 'creationTime',
            label: 'CREATION TIME',
            render: (val) => {
                if (!val) return '—';
                return (
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                        {new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                );
            }
        },
        {
            key: 'holiday',
            label: 'HOLIDAY',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${val ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-white/5'
                    }`}>
                    {val ? 'YES' : 'NO'}
                </span>
            )
        }
    ], []);

    const filterInputClass = "pl-3 pr-3 py-2 text-[11px] font-bold bg-white dark:bg-[#242938] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm w-full";

    const customFilterArea = (
        <div className="flex flex-wrap items-center gap-4 flex-1 bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            {/* Project Filter */}
            <div className="flex-1 min-w-[160px]">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 mb-1 ml-1 uppercase">Project</span>
                    <select
                        value={filters.project}
                        onChange={e => setFilters({ ...filters, project: e.target.value })}
                        className={filterInputClass}
                    >
                        <option value="">choose an option</option>
                        {PROJECTS.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Date From */}
            <div className="flex-1 min-w-[160px]">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 mb-1 ml-1 uppercase">Date From</span>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                        className={filterInputClass}
                    />
                </div>
            </div>

            {/* Date To */}
            <div className="flex-1 min-w-[160px]">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 mb-1 ml-1 uppercase">Date To</span>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                        className={filterInputClass}
                    />
                </div>
            </div>

            {/* Collaborators */}
            <div className="flex-1 min-w-[160px]">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 mb-1 ml-1 uppercase">Collaborators</span>
                    <input
                        type="text"
                        placeholder="Search User..."
                        value={filters.collaborator}
                        onChange={e => setFilters({ ...filters, collaborator: e.target.value })}
                        className={filterInputClass}
                    />
                </div>
            </div>

            {/* Clear Button */}
            <button
                onClick={handleClear}
                className="p-2.5 mt-auto bg-white dark:bg-[#1e2436] border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 transition-all active:scale-95 group shadow-sm flex items-center justify-center h-[38px] w-[42px]"
                title="Clear Filters"
            >
                <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
        </div>
    );

    const extraParams = useMemo(() => {
        const p = {};
        if (filters.project) p.Project = filters.project;
        if (filters.dateFrom) p.FromDate = filters.dateFrom;
        if (filters.dateTo) p.ToDate = filters.dateTo;
        if (filters.collaborator) p.UserIdsSearchValues = filters.collaborator;
        return p;
    }, [filters]);

    const headerActions = (
        <button
            type="button"
            className="flex items-center justify-center px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-blue-500 hover:text-blue-600 text-slate-600 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95"
            onClick={() => {
                alert('Report generation will be triggered here.');
            }}
        >
            Get Report
        </button>
    );

    // Provide an empty or basic ModalComponent just so ResourcePage displays the New button
    // It can be replaced later with the real Jobsheet modal
    const DummyModal = ({ open, onClose }) => {
        if (!open) return null;
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-xl">
                    <h2 className="text-xl font-bold mb-4 dark:text-white">New Jobsheet (Placeholder)</h2>
                    <p className="text-slate-500 mb-6">Jobsheet creation form goes here.</p>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold dark:text-white">Close</button>
                </div>
            </div>
        );
    };

    return (
        <ResourcePage
            title="Jobsheets"
            apiObject={jobsheetsApi}
            columns={columns}
            ModalComponent={DummyModal}
            createButtonText="New"
            searchPlaceholder="Global Jobsheet Search..."
            breadcrumb={['Home', 'Management', 'Jobsheets']}
            showSearchBar={false}
            customFilterArea={customFilterArea}
            customHeaderActions={headerActions}
            extraParams={extraParams}
            showActions={true} // True so the action menu column appears if requested, though you only mentioned the New button above. The New Button renders based on `apiObject.create` AND `ModalComponent`
            initialPageSize={10}
            showPagination={true}
            smallHeaderButton={true}
            entityName="Jobsheet"
        />
    );
}
