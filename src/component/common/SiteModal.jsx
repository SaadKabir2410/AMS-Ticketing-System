import { useState, useEffect } from 'react'
import { X, Loader2, Save, AlertCircle, Building2, MapPin, Hash } from 'lucide-react'
import { STATUSES } from '../../data/DB'

function Field({ label, error, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{label}</label>
            {children}
            {error && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle size={10} /> {error}
                </p>
            )}
        </div>
    )
}

const inputClass = "w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#242938] text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm"

const EMPTY = {
    siteName: '',
    siteOcn: '',
    location: '',
    status: 'Active',
}

export default function SiteModal({ open, onClose, onSubmit, site = null, loading = false }) {
    const isEdit = !!site
    const [form, setForm] = useState(EMPTY)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (open) {
            setErrors({})
            if (site) {
                setForm({
                    siteName: site.siteName || '',
                    siteOcn: site.siteOcn || '',
                    location: site.location || '',
                    status: site.status || 'Active',
                })
            } else {
                setForm(EMPTY)
            }
        }
    }, [open, site])

    const set = (key) => (e) => {
        setForm(f => ({ ...f, [key]: e.target.value }))
        if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
    }

    const validate = () => {
        const errs = {}
        if (!form.siteName) errs.siteName = 'Organization name is required'
        if (!form.siteOcn) errs.siteOcn = 'OCN number is required'
        if (!form.location) errs.location = 'Location is required'
        return errs
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }
        onSubmit(form)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl animate-slide-up overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                {isEdit ? 'Edit Site' : 'Add New Site'}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Organization Details</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-6 space-y-5">
                        <Field label="Organization Name" error={errors.siteName}>
                            <div className="relative">
                                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.siteName}
                                    onChange={set('siteName')}
                                    placeholder="e.g. NHSBT FILTON (MSC)"
                                    className={`${inputClass} pl-11`}
                                />
                            </div>
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Field label="OCN Number" error={errors.siteOcn}>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={form.siteOcn}
                                        onChange={set('siteOcn')}
                                        placeholder="e.g. OCE00791"
                                        className={`${inputClass} pl-11`}
                                    />
                                </div>
                            </Field>
                            <Field label="Status">
                                <select value={form.status} onChange={set('status')} className={inputClass}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </Field>
                        </div>

                        <Field label="Location / City" error={errors.location}>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={set('location')}
                                    placeholder="e.g. Bristol, UK"
                                    className={`${inputClass} pl-11`}
                                />
                            </div>
                        </Field>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {loading ? 'Saving...' : 'Save Site'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}