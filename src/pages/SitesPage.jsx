import ResourcePage from "../component/common/ResourcePage";
import { DB } from "../data/DB"
import SiteModal from "../component/common/SiteModal"
import SiteDetailModal from "../component/common/SiteDetailModal"
import DeleteConfirmModal from '../component/common/DeleteConfirmation'

export default function SitesPage() {
    const columns = [
        { key: 'name', label: 'NAME', bold: true },
        {
            key: 'ocn', label: 'OCN', render: (val, _row, searchTerm) => {
                const str = String(val || '');
                if (!searchTerm) return <span className="uppercase font-mono text-blue-500">{str}</span>;
                const idx = str.toLowerCase().indexOf(searchTerm.toLowerCase());
                if (idx === -1) return <span className="uppercase font-mono text-blue-500">{str}</span>;
                return (
                    <span className="uppercase font-mono text-blue-500">
                        {str.slice(0, idx)}
                        <mark style={{ background: '#fde047', color: '#713f12', borderRadius: '3px', padding: '0 2px', fontWeight: 700 }}>
                            {str.slice(idx, idx + searchTerm.length)}
                        </mark>
                        {str.slice(idx + searchTerm.length)}
                    </span>
                );
            }
        },
        { key: 'countryName', label: 'COUNTRY' },
        { key: 'address', label: 'ADDRESS' },
    ]

    return (
        <ResourcePage
            title="Sites"
            apiObject={DB.sites}
            columns={columns}
            ModalComponent={SiteModal}
            DetailComponent={SiteDetailModal}
            DeleteModal={DeleteConfirmModal}
            searchPlaceholder="Search by Site name, OCN, or Location..."
            createButtonText="New Site"
            breadcrumb={['Home', 'Sites']}
        />
    )
}