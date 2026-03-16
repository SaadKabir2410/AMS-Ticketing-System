import { useState, useMemo, useEffect } from 'react';
import ResourcePage from '../component/common/ResourcePage';
import { usersApi } from '../services/api/users';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { Eye, EyeOff } from 'lucide-react';

export default function UsersPage() {
    const [isCustomer, setIsCustomer] = useState(false);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'DISPLAY NAME',
            bold: true,
            flex: 1.5
        },
        {
            key: 'userName',
            label: 'USERNAME',
            flex: 1
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
                return <span className="text-sm text-slate-500 dark:text-slate-400">{types[val] || val || 'Regular'}</span>;
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
        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Show Customer</span>
            <button
                onClick={() => setIsCustomer(!isCustomer)}
                className={`relative w-8 h-4 rounded-full transition-colors duration-200 focus:outline-none ${isCustomer ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
            >
                <div
                    className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${isCustomer ? 'translate-x-4' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );

    // Modal for Creating/Editing a User
    const UserModal = ({ open, onClose, item, onSubmit, loading, submitError }) => {
        const [tabIndex, setTabIndex] = useState(0);
        // Track roles manually, default to an empty array or existing ones
        const [selectedRoles, setSelectedRoles] = useState([]);
        const [availableRoles, setAvailableRoles] = useState([]);
        const [validationErrors, setValidationErrors] = useState({});
        const [showPassword, setShowPassword] = useState(false);
        const [userData, setUserData] = useState(null);
        const [isLoadingData, setIsLoadingData] = useState(false);
        const [rolesPage, setRolesPage] = useState(1);
        const rolesPerPage = 5;

        // When the modal opens/item changes, load data if editing
        useEffect(() => {
            if (open) {
                setTabIndex(0);
                setRolesPage(1);
                setValidationErrors({});
                setShowPassword(false);

                // Fetch assignable roles dynamically
                usersApi.getAssignableRoles()
                    .then(res => setAvailableRoles(res.items || res || []))
                    .catch(e => console.error("Error fetching assignable roles", e));

                if (item) {
                    setIsLoadingData(true);
                    Promise.all([
                        usersApi.getById(item.id).catch(e => { console.error('Error fetching getById:', e); return null; }),
                        usersApi.getUserRoles(item.id).catch(e => { console.error('Error fetching getUserRoles:', e); return null; })
                    ]).then(([userRes, rolesRes]) => {
                        setUserData(userRes || item);

                        // Parse roles intelligently from whatever shape it returns
                        let rolesArray = [];
                        if (rolesRes) {
                            rolesArray = rolesRes.items || rolesRes || [];
                        } else if (item.roleNames) {
                            rolesArray = item.roleNames;
                        }

                        setSelectedRoles(rolesArray.map(r => r.name || r));
                    }).catch(error => {
                        console.error('Failed to resolve promises', error);
                        setUserData(item);
                        setSelectedRoles(item.roleNames || []);
                    }).finally(() => {
                        setIsLoadingData(false);
                    });
                } else {
                    setUserData(null);
                    setSelectedRoles([]);
                    setIsLoadingData(false);
                }
            }
        }, [open, item]);

        const toggleRole = (role) => {
            setSelectedRoles(prev => {
                const found = prev.find(r => typeof r === 'string' && typeof role === 'string' && r.toLowerCase() === role.toLowerCase());
                return found
                    ? prev.filter(r => r !== found)
                    : [...prev, role];
            });
        };

        if (!open) return null;

        const handleSubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Custom Validation
            const errors = {};
            if (!data.userName?.trim()) errors.userName = "The User name field is required";
            if (!data.name?.trim()) errors.name = "The Name field is required";
            if (!item && !data.password?.trim()) errors.password = "The Password field is required";
            if (!data.phoneNumber?.trim()) errors.phoneNumber = "The Phone number field is required";
            if (!data.organizationType?.trim()) errors.organizationType = "The Organization Type field is required";

            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setTabIndex(0); // Make sure they see the errors
                return;
            }

            setValidationErrors({});

            // Handle checkboxes properly
            data.isActive = formData.get('isActive') === 'on';
            data.lockoutEnabled = formData.get('lockoutEnabled') === 'on';
            data.isPrimary = formData.get('isPrimary') === 'on';
            data.isITS = formData.get('isITS') === 'on';

            // Include roles array
            data.roleNames = selectedRoles;

            // If editing, only send password if user typed a new one
            if (item && !data.password) {
                delete data.password;
            }

            if (data.organizationType) {
                data.organizationType = parseInt(data.organizationType, 10);
            }

            // If editing, carry over server-required fields
            if (userData) {
                data.concurrencyStamp = userData.concurrencyStamp;
                data.id = userData.id;
            } else if (item) {
                data.concurrencyStamp = item.concurrencyStamp;
                data.id = item.id;
            }

            onSubmit(data);
        };

        return (
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: '24px', padding: 0, boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.15)' }
                }}
            >
                <div className="bg-white dark:bg-[#1e2436] px-6 py-5 border-b border-slate-100 dark:border-white/10 shrink-0">
                    <h2 className="text-base font-black dark:text-white uppercase tracking-tight text-slate-800 flex items-center gap-2">
                        {item ? 'Edit User' : 'Create User'}
                    </h2>
                </div>

                <form key={userData ? userData.id : 'new'} onSubmit={handleSubmit} noValidate>
                    <DialogContent dividers sx={{ minHeight: '400px', p: 0, position: 'relative' }}>
                        {isLoadingData && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
                                <p className="text-sm font-bold text-slate-500 animate-pulse">Loading user details...</p>
                            </div>
                        )}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 1 }}>
                            <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} indicatorColor="primary" textColor="primary">
                                <Tab label="User Information" sx={{ fontWeight: 'bold' }} />
                                <Tab label="Roles" sx={{ fontWeight: 'bold' }} />
                            </Tabs>
                        </Box>

                        <div className="p-6">
                            {/* TAB 1: USER INFORMATION */}
                            <div style={{ display: tabIndex === 0 ? 'block' : 'none' }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">User name *</label>
                                        <input
                                            name="userName"
                                            defaultValue={userData?.userName || ''}
                                            className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border ${validationErrors.userName ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-white/10 focus:ring-blue-500/20'} rounded-xl outline-none focus:ring-2 font-bold text-sm transition-all duration-200`}
                                        />
                                        {validationErrors.userName && <p className="text-red-500 text-[10px] font-bold mt-1.5 uppercase ml-1">{validationErrors.userName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Name *</label>
                                        <input
                                            name="name"
                                            defaultValue={userData?.name || ''}
                                            className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border ${validationErrors.name ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-white/10 focus:ring-blue-500/20'} rounded-xl outline-none focus:ring-2 font-bold text-sm transition-all duration-200`} />
                                        {validationErrors.name && <p className="text-red-500 text-[10px] font-bold mt-1.5 uppercase ml-1">{validationErrors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Surname</label>
                                        <input
                                            name="surname"
                                            defaultValue={userData?.surname || ''}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm transition-all duration-200"

                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Password {item ? '(Leave blank to keep)' : '*'}</label>
                                        <div className="relative">
                                            <input
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border ${validationErrors.password ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-white/10 focus:ring-blue-500/20'} rounded-xl outline-none focus:ring-2 font-bold text-sm pr-12 transition-all duration-200`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={16} strokeWidth={2.5} /> : <Eye size={16} strokeWidth={2.5} />}
                                            </button>
                                        </div>
                                        {validationErrors.password && <p className="text-red-500 text-[10px] font-bold mt-1.5 uppercase ml-1">{validationErrors.password}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Email Address</label>
                                        <input
                                            name="email"
                                            type="email"
                                            defaultValue={userData?.email || ''}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm transition-all duration-200"

                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Phone Number *</label>
                                        <input
                                            name="phoneNumber"
                                            defaultValue={userData?.phoneNumber || ''}
                                            className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border ${validationErrors.phoneNumber ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-white/10 focus:ring-blue-500/20'} rounded-xl outline-none focus:ring-2 font-bold text-sm transition-all duration-200`}

                                        />
                                        {validationErrors.phoneNumber && <p className="text-red-500 text-[10px] font-bold mt-1.5 uppercase ml-1">{validationErrors.phoneNumber}</p>}
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Organization Type *</label>
                                        <select
                                            name="organizationType"
                                            defaultValue={userData?.organizationType || ''}
                                            className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border ${validationErrors.organizationType ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-white/10 focus:ring-blue-500/20'} rounded-xl outline-none focus:ring-2 font-bold text-sm transition-all duration-200`}
                                        >
                                            <option value="" disabled>Select an option</option>
                                            <option value="1">Customer</option>
                                            <option value="2">Vendor (Sureze)</option>
                                            <option value="3">Vendor (Abbott)</option>
                                        </select>
                                        {validationErrors.organizationType && <p className="text-red-500 text-[10px] font-bold mt-1.5 uppercase ml-1">{validationErrors.organizationType}</p>}
                                    </div>
                                </div>

                                {/* Checkboxes for boolean settings */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-xl p-5 border border-slate-200">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="isPrimary" defaultChecked={userData?.isPrimary} className="w-5 h-5 rounded text-blue-600 border-slate-300" />
                                        <span className="text-sm font-bold text-slate-700">Primary</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="isITS" defaultChecked={userData?.isITS} className="w-5 h-5 rounded text-blue-600 border-slate-300" />
                                        <span className="text-sm font-bold text-slate-700">ITS</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="isActive" defaultChecked={userData ? userData.isActive : true} className="w-5 h-5 rounded text-blue-600 border-slate-300" />
                                        <span className="text-sm font-bold text-slate-700">Active</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" name="lockoutEnabled" defaultChecked={userData ? userData.lockoutEnabled : true} className="w-5 h-5 rounded text-blue-600 border-slate-300" />
                                        <span className="text-sm font-bold text-slate-700">Account lockout</span>
                                    </label>
                                </div>
                            </div>

                            {/* TAB 2: ROLES */}
                            <div style={{ display: tabIndex === 1 ? 'block' : 'none' }}>
                                <div className="space-y-4 max-w-sm mx-auto p-4 py-6">
                                    <p className="text-[11px] text-slate-400 font-bold mb-6 uppercase tracking-widest text-center">Assign Roles to User</p>
                                    {availableRoles
                                        .slice((rolesPage - 1) * rolesPerPage, rolesPage * rolesPerPage)
                                        .map(roleObj => {
                                            const roleName = typeof roleObj === 'object' ? roleObj.name : roleObj;
                                            if (!roleName) return null;
                                            const isChecked = selectedRoles.some(r => typeof r === 'string' && r.toLowerCase() === roleName.toLowerCase());
                                            const displayRole = roleName.charAt(0).toUpperCase() + roleName.slice(1);
                                            return (
                                                <label key={roleName} className="flex items-center gap-3 p-3 border-2 border-slate-100 dark:border-white/10 rounded-xl hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 dark:hover:bg-white/5 cursor-pointer transition-all duration-200 group">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleRole(roleName)}
                                                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer transition-transform"
                                                    />
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{displayRole}</span>
                                                </label>
                                            );
                                        })}

                                    {/* Pagination Controls */}
                                    {availableRoles.length > rolesPerPage && (
                                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setRolesPage(1)}
                                                    disabled={rolesPage === 1}
                                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    First
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRolesPage(prev => Math.max(1, prev - 1))}
                                                    disabled={rolesPage === 1}
                                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Prev
                                                </button>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Page {rolesPage} of {Math.ceil(availableRoles.length / rolesPerPage)}
                                            </span>
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setRolesPage(prev => Math.min(Math.ceil(availableRoles.length / rolesPerPage), prev + 1))}
                                                    disabled={rolesPage === Math.ceil(availableRoles.length / rolesPerPage)}
                                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Next
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRolesPage(Math.ceil(availableRoles.length / rolesPerPage))}
                                                    disabled={rolesPage === Math.ceil(availableRoles.length / rolesPerPage)}
                                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Last
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {submitError && (
                                <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                                    <p className="text-xs text-rose-500 font-bold uppercase tracking-tight">Error: {submitError}</p>
                                </div>
                            )}
                        </div>
                    </DialogContent>

                    <div className="flex gap-2.5 px-6 py-4 bg-slate-50 dark:bg-[#1a1f2e] border-t border-slate-100 dark:border-white/10 w-full rounded-b-[24px]">
                        <button type="button" onClick={onClose} className="flex-1 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 font-black text-slate-500 dark:text-slate-300 hover:bg-slate-200 transition-colors uppercase tracking-wider">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 text-xs rounded-xl bg-blue-600 text-white font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all duration-200 uppercase tracking-wider"
                        >
                            {loading ? 'Wait...' : (item ? 'Save' : 'Create')}
                        </button>
                    </div>
                </form>
            </Dialog>
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
            showAuditLog={false}
        />
    );
}
