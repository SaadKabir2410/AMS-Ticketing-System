import { useState, useEffect, useRef } from 'react';
import { Dialog, IconButton } from '@mui/material';
import { X, Loader2, Check, AlertCircle } from 'lucide-react';
import { DB } from '../../data/DB';

const EMPTY = { description: '', code: '' };

export default function WorkCodeModal({ open, onClose, onSubmit, item = null, loading = false, submitError = null }) {
    const isEdit = !!item;
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [checkingCode, setCheckingCode] = useState(false);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        if (open) {
            setErrors({});
            setCheckingCode(false);
            setForm(item ? { description: item.description || '', code: item.code || '' } : EMPTY);
        }
        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [open, item]);

    const checkCodeExists = async () => {
        const code = form.code.trim().toUpperCase();
        if (!code) return;

        // Skip check if we are editing and the code hasn't changed
        if (isEdit && item && item.code && item.code.toUpperCase() === code) {
            return;
        }

        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        setIsChecking(true);
        try {
            const data = await DB.workCodes.checkCodeExists(code, abortControllerRef.current.signal);
            const items = data.items || [];
            const codeLower = code.toLowerCase();

            // Serverside search is good, but let's be 100% sure with an exact match check
            const isDuplicate = items.some(item =>
                (item.code || '').toLowerCase() === codeLower
            );

            if (isDuplicate) {
                setErrors(prev => ({ ...prev, code: `Code "${code}" already exists` }));
            }
        } catch (err) {
            if (err.name !== 'CanceledError') {
                console.error('Check code error:', err);
            }
        } finally {
            setIsChecking(false);
        }
    };

    const validate = () => {
        const errs = {};
        const code = form.code.trim();
        const desc = form.description.trim();

        if (!desc) {
            errs.description = 'Description is required';
        } else if (desc.length > 250) {
            errs.description = 'Maximum Length 250';
        }

        if (!code) {
            errs.code = 'Code is required';
        } else if (code.length > 8) {
            errs.code = 'Maximum 8 Character';
        }
        return errs;
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        if (errors.code || isChecking) return;

        const payload = {
            Description: form.description.trim(),
            Code: form.code.trim().toUpperCase()
        };

        try {
            const finalPayload = isEdit ? { ...item, ...payload } : payload;
            await onSubmit(finalPayload);
        } catch (err) {
            const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
            if (msg.toLowerCase().includes('code')) {
                setErrors(prev => ({ ...prev, code: msg }));
            } else {
                setErrors(prev => ({ ...prev, server: msg }));
            }
        }
    };

    const inputClasses = (error, isValid) =>
        `w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ` +
        (error
            ? `bg-red-50/50 border-red-400 text-red-900 placeholder:text-red-300 dark:bg-red-500/10 dark:border-red-500/50 dark:text-red-200`
            : isValid
                ? `bg-green-50/50 border-green-500 focus:border-green-600 text-green-900 dark:bg-green-500/10 dark:border-green-500/50 dark:text-green-200`
                : `bg-slate-50 border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 text-slate-700 placeholder:text-slate-400 dark:bg-[#242938] dark:border-white/10 dark:text-slate-200 dark:focus:border-blue-500`);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { borderRadius: '16px', bgcolor: 'background.paper', p: 1 },
                className: 'bg-white dark:bg-[#1e2436] dark:text-white'
            }}
        >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {isEdit ? 'Update Work Code' : 'Create Work Code'}
                </h2>
                <IconButton onClick={onClose} size="small">
                    <X size={20} />
                </IconButton>
            </div>

            <div className="px-6 py-2 space-y-5">
                {(submitError || errors.server) && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                        {submitError || errors.server}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            maxLength={12} // Slightly higher than 8 to allow seeing the validation message if pasted
                            placeholder="Enter Code"
                            value={form.code}
                            onChange={e => {
                                setForm(f => ({ ...f, code: e.target.value.toUpperCase() }));
                                if (errors.code) setErrors(errs => ({ ...errs, code: '' }));
                            }}
                            onBlur={checkCodeExists}
                            className={inputClasses(errors.code, form.code.length > 0 && !errors.code && !checkingCode)}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            {checkingCode && <Loader2 size={16} className="animate-spin text-blue-500" />}
                            {errors.code && <AlertCircle size={16} className="text-red-500" />}
                            {!checkingCode && !errors.code && form.code.length > 0 && (
                                <Check size={16} className="text-green-500" />
                            )}
                        </div>
                    </div>
                    {errors.code && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.code}</p>}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        Description <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            maxLength={300} // Slightly higher than 250 to allow seeing the validation message if pasted
                            placeholder="Enter Description"
                            value={form.description}
                            onChange={e => {
                                setForm(f => ({ ...f, description: e.target.value }));
                                if (errors.description) setErrors(errs => ({ ...errs, description: '' }));
                            }}
                            className={inputClasses(errors.description, form.description.length > 0 && !errors.description)}
                        />
                        {form.description.length > 0 && !errors.description && (
                            <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                        )}
                    </div>
                    {errors.description && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.description}</p>}
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pt-6 pb-5">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading || checkingCode || !!errors.code}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-100 dark:shadow-none transition-all"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : (isEdit ? 'Update' : 'Create')}
                </button>
            </div>
        </Dialog >
    );
}
