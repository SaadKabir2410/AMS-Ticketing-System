import { useState, useRef } from "react";
import ResourcePage from "../component/common/ResourcePage";
import codesApi from "../services/api/Code";
import CodeModal from "../component/common/CodeModal";
import DeleteConfirmModal from "../component/common/DeleteConfirmation";
import { useToast } from "../component/common/ToastContext";

export default function CodePage() {
  const { toast } = useToast();
  const refetchRef = useRef(null);

  const [actionItem, setActionItem] = useState(null);
  const [actionType, setActionType] = useState("");
  const [loading, setLoading] = useState(false);

  const columns = [
    { key: "lookupCode", label: "LOOKUP CODE", bold: true },
    { key: "description", label: "DESCRIPTION", minWidth: 200, flex: 2 },
    { key: "sequence", label: "SEQUENCE" },
    {
      key: "isSystemIndicator",
      label: "SYSTEM INDICATOR",
      render: (val) => (
        <div className="flex items-center w-full h-full">
          <input
            type="checkbox"
            checked={!!val}
            readOnly
            className="w-4 h-4 text-blue-600 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2 cursor-default pointer-events-none transition-all"
          />
        </div>
      )
    },
    {
      key: "isActive",
      label: "ACTIVE",
      render: (val) => (
        <div className="flex items-center w-full h-full">
          <input
            type="checkbox"
            checked={!!val}
            readOnly
            className="w-4 h-4 text-blue-600 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2 cursor-default pointer-events-none transition-all"
          />
        </div>
      )
    },
  ];

  const confirmAction = async () => {
    if (!actionItem) return;
    setLoading(true);
    try {
      if (actionType === "disable") {
        await codesApi.disable(actionItem.id);
        toast(`Record disabled !successfully`);
      } else if (actionType === "enable") {
        await codesApi.enable(actionItem.id);
        toast(`Record enabled !successfully`);
      }
      if (refetchRef.current) {
        await refetchRef.current();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "An error occurred.";
      toast(`Failed to ${actionType} record: ${msg}`, "error");
    } finally {
      setLoading(false);
      setActionItem(null);
      setActionType("");
    }
  };

  return (
    <>
      <ResourcePage
        title="Codes"
        apiObject={codesApi}
        columns={columns}
        ModalComponent={CodeModal}
        searchPlaceholder="Search codes..."
        createButtonText="New code"
        breadcrumb={["Home", "Management", "Lookups", "Codes"]}
        showSearchBar={true}
        showFilterBar={false}
        showPagination={false}
        entityName="Lookup"
        initialSortKey="sequence"
        initialSortDir="asc"
        onRefetchReady={(fn) => { refetchRef.current = fn; }}
        onDisable={(row) => {
          setActionItem(row);
          setActionType("disable");
        }}
        onDisableVisibilityCheck={(row) => row.isActive === true}
        onEnable={(row) => {
          setActionItem(row);
          setActionType("enable");
        }}
        onEnableVisibilityCheck={(row) => row.isActive === false}
        onEditVisibilityCheck={(row) => row.isActive === true}
        hideActionsCheck={(row) => row.isSystemIndicator === true}
      />

      <DeleteConfirmModal
        open={!!actionItem}
        item={actionItem}
        loading={loading}
        title={actionType === "disable" ? "Confirm Disable" : "Confirm Enable"}
        confirmText={actionType === "disable" ? "Disable Now" : "Enable Now"}
        onClose={() => { setActionItem(null); setActionType(""); }}
        onConfirm={confirmAction}
      />
    </>
  );
}


