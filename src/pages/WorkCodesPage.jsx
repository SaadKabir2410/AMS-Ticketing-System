import ResourcePage from "../component/common/ResourcePage";
import { workCodesApi } from "../services/api/workCodes";
import WorkCodeModal from "../component/common/WorkCodeModal";

export default function WorkCodesPage() {
  const columns = [
    { key: "code", label: "CODE", bold: true },
    { key: "description", label: "DESCRIPTION" },
  ];

  return (
    <ResourcePage
      title="Work Done Codes"
      apiObject={workCodesApi}
      columns={columns}
      ModalComponent={WorkCodeModal}
      searchPlaceholder="Search work codes..."
      createButtonText="Add New"
      breadcrumb={["Home", "Management", "Lookups", "Work Done Codes"]}
      showSearchBar={true}
      showFilterBar={false}
      showActions={true}
      entityName="WorkDoneCode"
      initialSortKey="code"
      initialSortDir="asc"
    />
  );
}
