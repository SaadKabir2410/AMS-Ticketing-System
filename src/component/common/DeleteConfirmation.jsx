

export default function DeleteConfirmModal({
  open,
  onClose,
  onCancel,
  onConfirm,
  ticket,
  site,
  item,
  loading,
  title = "Confirm Delete",
  message = "Are you sure you want to proceed with this action?",
  confirmText = "Delete Now",
  cancelText = "Cancel",
  processingText = "Processing...",
  blurBackdrop = true,
  compact = false,
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
        className={`absolute inset-0 bg-black/40 ${blurBackdrop ? "backdrop-blur-sm" : ""}`}
        onClick={onClose}
      />
      <div className={`relative w-full ${compact ? "max-w-xs px-5 py-4 rounded-2xl" : "max-w-sm p-8 pt-12 rounded-2xl"} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl animate-fade-in text-center font-[Arial]`}>

        <h3 className={`${compact ? "text-base font-semibold mb-1" : "text-lg mb-2"} text-slate-800 dark:text-white`}>
          {title}
        </h3>
        <p className={`${compact ? "text-sm leading-snug" : "text-sm mb-1"} text-slate-500 dark:text-slate-400`}>
          {message}
        </p>
        <p className={`${compact ? "text-sm mb-4" : "text-sm mb-8"} font-mono text-blue-500`}>{identifier}</p>


        <div className={`flex ${compact ? "gap-2" : "gap-3"}`}>
          <button
            onClick={onCancel || onClose}
            className={`flex-1 ${compact ? "py-2 rounded-lg text-sm" : "py-2.5 rounded-xl text-sm"} border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 ${compact ? "py-2 rounded-lg text-sm" : "py-2.5 rounded-xl text-sm"} bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white transition-all shadow-lg shadow-red-500/20`}
          >

            {loading ? processingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}




