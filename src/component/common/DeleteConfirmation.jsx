import { Trash2, X, Loader2 } from 'lucide-react'

export default function DeleteConfirmModal({ open, onClose, onConfirm, ticket, site, item, loading }) {
    const activeItem = item || ticket || site
    if (!open || !activeItem) return null

    const identifier = activeItem.ticketNo || activeItem.siteName || activeItem.id

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl animate-fade-in p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Confirm Delete</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    Are you sure you want to permanently delete this record?
                </p>
                <p className="text-sm font-mono font-semibold text-blue-500 mb-5">{identifier}</p>
                <p className="text-xs text-slate-400 mb-6">This action cannot be undone.</p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white text-sm font-semibold transition-all shadow-lg shadow-red-500/20"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        {loading ? 'Deleting...' : 'Delete Now'}
                    </button>
                </div>
            </div>
        </div>
    )
}
