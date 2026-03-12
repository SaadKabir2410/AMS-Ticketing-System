import { useState, useMemo } from 'react';
import ResourcePage from '../component/common/ResourcePage';
import { usersApi } from '../services/api/users';

export default function UsersPage() {
    const [isCustomer, setIsCustomer] = useState(false);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'USER NAME',
            bold: true,
            flex: 1.5
        },
        {
            key: 'email',
            label: 'EMAIL ADDRESS',
            flex: 2
        },
        {
            key: 'phoneNumber',
            label: 'PHONE NUMBER',
            flex: 1.2
        },
        {
            key: 'organizationType',
            label: 'USER TYPE',
            render: (val) => {
                const types = {
                    1: 'Admin',
                    2: 'Employee',
                    3: 'Client',
                };
                const label = types[val] || val || 'Regular';
                const style = val === 1 ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400' : 
                             val === 3 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' :
                             'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400';
                return (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${style}`}>
                        {label}
                    </span>
                );
            }
        },
        {
            key: 'siteName',
            label: 'SITE NAME',
            flex: 1.5
        },
        {
            key: 'isPrimary',
            label: 'PRIMARY',
            render: (val) => (
                <div className="flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${val ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-white/10'}`} />
                </div>
            )
        }
    ], []);

    const customFilterArea = (
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Show Customer</span>
            <button
                onClick={() => setIsCustomer(!isCustomer)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${isCustomer ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
            >
                <div
                    className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${isCustomer ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );

    // Dummy Modal for "New User" button to appear
    const UserModal = ({ open, onClose }) => {
        if (!open) return null;
        return (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-white dark:bg-[#1e2436] rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-white/10">
                    <h2 className="text-xl font-bold dark:text-white mb-6 uppercase tracking-tight">Create New User</h2>
                    <p className="text-slate-500 text-sm mb-8">This form will allow you to add a new user to the system.</p>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/5 font-bold dark:text-white">Cancel</button>
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20">Create</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <ResourcePage
            title="Users"
            apiObject={usersApi}
            columns={columns}
            ModalComponent={UserModal}
            searchPlaceholder="Search users by name, email or phone..."
            createButtonText="New User"
            breadcrumb={['Home', 'Administration', 'Identity Management', 'Users']}
            smallHeaderButton={true}
            showPagination={true}
            initialPageSize={10}
            entityName="User"
            customFilterArea={customFilterArea}
            extraParams={{ isCustomer }}
        />
    );
}
