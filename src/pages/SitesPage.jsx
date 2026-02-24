import ResourcePage from "../component/common/ResourcePage";
import { DB } from "../data/DB"
import SiteModal from "../component/common/SiteModal"
import DeleteConfirmModal from '../component/common/DeleteConfirmation'

export default function SitesPage() {
    const columns = [
        { key: 'siteName', label: 'Organization Name', bold: true },
        { key: 'siteOcn', label: 'OCN Number', render: (val) => <span className="uppercase font-mono text-blue-500">{val}</span> },
        { key: 'location', label: 'City/Region' },
        {
            key: 'status',
            label: 'Status',
            render: (val) => (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${val === 'Active' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                        val === 'Inactive' ? 'bg-red-100 dark:bg-red-500/15 text-red-500 dark:text-red-400' :
                            'bg-slate-100 dark:bg-white/5 text-slate-500'
                    }`}>
                    {val}
                </span>
            )
        },
    ]

    return (
        <ResourcePage
            title="Sites"
            apiObject={DB.sites}
            columns={columns}
            ModalComponent={SiteModal}
            DeleteModal={DeleteConfirmModal}
            searchPlaceholder="Search by Site name, OCN, or Location..."
            createButtonText="New Site"
            breadcrumb={['Home', 'Sites']}
        />
    )
}