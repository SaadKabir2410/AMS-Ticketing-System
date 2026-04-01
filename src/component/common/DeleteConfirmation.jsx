

export default function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  ticket,
  site,
  item,
  loading,
  title = "Confirm Delete",
  confirmText = "Delete Now",
}) {
  const activeItem = item || ticket || site;
  if (!open || !activeItem) return null;

  const identifier =
    activeItem.ticketNo || 
    activeItem.siteName || 
    activeItem.projectDescription || 
    activeItem.description || 
    activeItem.lookupCode || 
    activeItem.code || 
    activeItem.userName || 
    activeItem.name || 
    activeItem.id;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl animate-fade-in p-8 pt-12 text-center">

        <h3 className="text-lg text-slate-800 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
          Are you sure you want to proceed with this action?
        </p>
        <p className="text-sm font-mono text-blue-500 mb-8">{identifier}</p>


        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white text-sm transition-all shadow-lg shadow-red-500/20"
          >

            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
