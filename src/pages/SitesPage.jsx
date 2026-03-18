import ResourcePage from "../component/common/ResourcePage";
import { sitesApi } from "../services/api/sites";
import SiteModal from "../component/common/SiteModal";
import SiteDetailModal, {
  SiteDetailContent,
} from "../component/common/SiteDetailModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";

export default function SitesPage() {
  const columns = [
    { key: "name", label: "NAME", bold: true },
    {
      key: "ocn",
      label: "OCN",
      render: (val, _row, searchTerm) => {
        const str = String(val || "");
        if (!searchTerm)
          return <span className=" font-mono text-blue-500 ">{str}</span>;
        const idx = str.toLowerCase().indexOf(searchTerm.toLowerCase());
        if (idx === -1)
          return <span className=" font-mono text-blue-500 ">{str}</span>;
        return (
          <span className=" font-mono text-blue-500 ">
            {str.slice(0, idx)}
            <mark className="bg-yellow-200 text-yellow-900 rounded-[2px] px-[2px]">
              {str.slice(idx, idx + searchTerm.length)}
            </mark>
            {str.slice(idx + searchTerm.length)}
          </span>
        );
      },
    },
    { key: "countryName", label: "COUNTRY" },
    { key: "address", label: "ADDRESS" },
  ];

  return (
    <ResourcePage
      title="Sites"
      apiObject={sitesApi}
      columns={columns}
      ModalComponent={SiteModal}
      DetailComponent={SiteDetailModal}
      SecondaryDetailComponent={SiteDetailContent}
      detailViewMode="modal"
      DeleteModal={DeleteConfirmModal}
      searchPlaceholder="Search by Site name, OCN, or Location..."
      createButtonText="Create Site"
      breadcrumb={["Home", "Management", "Lookups", "Sites"]}
      entityName="Site"
    />
  );
}
