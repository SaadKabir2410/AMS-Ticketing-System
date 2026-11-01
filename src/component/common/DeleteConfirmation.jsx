

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
  blurBackdrop = false,
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
      />
      <div className={`relative w-full max-w-[320px] px-5 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl animate-fade-in text-center font-[Arial]`}>

        <h3 className={`text-base font-semibold mb-1 text-slate-800 dark:text-white`}>
          {title}
        </h3>
        <p className={`text-sm leading-snug text-slate-500 dark:text-slate-400`}>
          {message}
        </p>
        <p className={`text-sm mb-4 font-semibold text-pink-600 dark:text-pink-400 break-words`}>{identifier}</p>


        <div className={`flex gap-2`}>
          <button
            onClick={onCancel || onClose}
            className={`flex-1 h-8 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 h-8 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white transition-colors`}
          >

            {loading ? processingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}




