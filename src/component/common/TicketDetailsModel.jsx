import { X, Clock, User, Calendar, Hash, Building2, CheckCircle2, Circle } from 'lucide-react'

function formatDate(val) {
    if (!val) return '—'
    try {
        return new Date(val).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    } catch { return val }
}

function Row({ label, value, mono = false }) {
    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
            <p className={`text-sm text-slate-700 dark:text-slate-200 ${mono ? 'font-mono font-semibold text-blue-500' : 'font-medium'}`}>
                {value || '—'}
            </p>
        </div>
    )
}

const statusStyle = {
    'Open': 'bg-red-100 dark:bg-red-500/15 text-red-500 dark:text-red-400',
    'In Progress': 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
    'Closed': 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

export default function TicketDetailModal({ open, onClose, ticket }) {
    if (!open || !ticket) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-xl bg-white dark:bg-[#1e2436] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl animate-fade-in overflow-hidden">

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle[ticket.status] || statusStyle.Open}`}>
                                {ticket.status}
                            </span>
                            {ticket.pre && (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">
                                    PRE
                                </span>
                            )}
                        </div>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">{ticket.siteName}</p>
                        <p className="text-xs font-mono text-blue-500 mt-0.5">{ticket.ticketNo}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 grid grid-cols-2 gap-5">
                    <Row label="Site OCN" value={ticket.siteOcn} />
                    <Row label="CMS Ticket No" value={ticket.ticketNo} mono />
                    <Row label="Created By" value={ticket.createdBy} />
                    <Row label="Ticket Closed By" value={ticket.ticketClosedBy || '—'} />
                    <Row label="Received Date" value={formatDate(ticket.receivedAt)} />
                    <Row label="Total Duration" value={ticket.totalDuration ? `${ticket.totalDuration} hrs` : '—'} />
                    <Row label="CMS Ticket Closed On" value={formatDate(ticket.cmsTicketClosedOn)} />
                    <Row label="Service Closed Date" value={formatDate(ticket.serviceClosedDate)} />
                    <Row label="Created At" value={formatDate(ticket.createdAt)} />
                    <Row label="Last Updated" value={formatDate(ticket.updatedAt)} />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}