import ResourcePage from '../component/common/ResourcePage';
import { DB } from '../data/DB';
import CountryModal from '../component/common/CountryModal';

export default function CountriesPage() {
    const columns = [
        { key: 'name', label: 'COUNTRY NAME', bold: true },
        { key: 'code', label: 'COUNTRY CODE' },
    ];

    return (
        <ResourcePage
            title="Countries"
            apiObject={DB.countries}
            columns={columns}
            ModalComponent={CountryModal}
            searchPlaceholder="Search countries..."
            createButtonText="Add New"
            breadcrumb={['Home', 'Management', 'Lookups', 'Countries']}
            showSearchBar={true}
            showFilterBar={false}
            entityName="Country"
        />
    );
}
