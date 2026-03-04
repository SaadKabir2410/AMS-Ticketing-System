import { useMemo } from 'react';
import ResourcePage from '../component/common/ResourcePage';
import { DB } from '../data/DB';

export default function UserWorkingHoursPage() {
    const columns = useMemo(() => [
        {
            key: 'userName',
            label: 'USER NAME',
            bold: true,
            render: (val) => (
                <span className="font-bold text-slate-800 dark:text-white uppercase">
                    {val || '—'}
                </span>
            )
        },
        {
            key: 'weekDay',
            label: 'WEEK DAY',
            render: (val) => (
                <span className="text-[11px] font-black uppercase bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                    {val || '—'}
                </span>
            )
        },
        {
            key: 'startTime',
            label: 'START TIME',
            render: (val) => (
                <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                    {val || '—'}
                </span>
            )
        },
        {
            key: 'endTime',
            label: 'END TIME',
            render: (val) => (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                    {val || '—'}
                </span>
            )
        }
    ], []);

    return (
        <ResourcePage
            title="User Working Hours"
            apiObject={DB.workingHours}
            columns={columns}
            searchPlaceholder="Search users..."
            breadcrumb={['Home', 'Management', 'Users', 'Working Hours']}
            showSearchBar={true}
            showActions={false}
            showPagination={false}
            initialPageSize={100}
            entityName="Working Hour"
        />
    );
}
