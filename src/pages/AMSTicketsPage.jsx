import { Plus } from 'lucide-react'
import ResourcePage from '../component/common/ResourcePage'
import { DB } from '../data/DB'
import TicketModal from '../component/common/TicketModal'
import TicketDetailModal from '../component/common/TicketDetailModal'
import DeleteConfirmModal from '../component/common/DeleteConfirmation'

// Helper to format date
const formatDate = (val) => {
    if (!val) return '—'
    try {
        const d = new Date(val)
        return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    } catch { return val }
}

// Status Badge Renderer
const StatusBadge = ({ status }) => {
    const styles = {
        Open: 'bg-red-100 dark:bg-red-500/15 text-red-500 dark:text-red-400',
        'In Progress': 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
        Closed: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    }
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${styles[status] || styles.Open}`}>
            {status}
        </span>
    )
}

export default function AMSTicketsPage() {
    const columns = [
        { key: 'siteName', label: 'Site Name', bold: true },
        { key: 'siteOcn', label: 'OCN', render: (val) => <span className="uppercase">{val}</span> },
        { key: 'ticketNo', label: 'Ticket ID', render: (val) => <span className="font-mono text-blue-500 font-black">{val}</span> },
        { key: 'receivedAt', label: 'Received At', render: formatDate },
        { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
        {
            key: 'pre',
            label: 'PRE',
            render: (val) => (
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${val ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-200 dark:border-white/10'}`}>
                    {val && <Plus size={12} strokeWidth={4} />}
                </div>
            )
        },
        { key: 'ticketClosedBy', label: 'Closed By' },
        { key: 'createdBy', label: 'Created By' },
        { key: 'totalDuration', label: 'Duration', render: (val) => <span className="font-mono">{val} hr</span> },
    ]

    return (
        <ResourcePage
            title="AMS Tickets"
            apiObject={DB.tickets}
            columns={columns}
            ModalComponent={TicketModal}
            DetailComponent={TicketDetailModal}
            DeleteModal={DeleteConfirmModal}
            searchPlaceholder="Search by Ticket ID, Site, or Assignee..."
            createButtonText="New Ticket"
            breadcrumb={['Home', 'AMS Tickets']}
        />
    )
}
