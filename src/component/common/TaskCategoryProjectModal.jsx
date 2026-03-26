import { useState } from "react";
import { Dialog, IconButton } from "@mui/material";

const TASK_CATEGORIES = [
  "AMS Ticketing",
  "Hardware Installation",
  "Network Troubleshooting",
  "Software Upgrade",
  "Database Cleanup",
  "System Maintenance",
  "Onsite Support",
  "Remote Assistance",
  "Documentation",
  "Meeting",
  "Project Planning",
  "System Testing",
  "Development",
  "Training",
  "Consultation",
  "Reporting & Documentation"
];

export default function TaskCategoryProjectModal({ open, onClose }) {
  const [project, setProject] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);

  const handleToggle = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = () => {
    // API call logic goes here...
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "12px", bgcolor: "background.paper", padding: "4px" },
        className: "bg-white dark:bg-slate-900 dark:text-white shadow-2xl",
      }}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white">
          New Task Category Project
        </h2>
        <IconButton onClick={onClose} size="small" className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </IconButton>
      </div>

      <div className="px-5 py-2">
        {/* Project Select */}
        <div className="mb-4">
          <label className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1 font-medium">
            Project <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-3 pr-8 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer shadow-sm"
            >
              <option value="" disabled className="text-slate-400">Choose An Option</option>
              <option value="AMS">AMS</option>
              <option value="central monitoring">central monitoring</option>
              <option value="LIS">LIS</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Checkbox List */}
        <div className="space-y-1.5 pr-1">
          {TASK_CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => handleToggle(category)}
                  className="peer appearance-none w-3.5 h-3.5 border border-slate-300 dark:border-slate-600 rounded-sm bg-slate-50 dark:bg-slate-800 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                />
                <svg
                  className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="3"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-300 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
                {category}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-5 pt-5 pb-3">
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg border border-indigo-400 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-[11px] font-semibold transition-colors shadow-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-[11px] font-semibold transition-colors shadow-sm"
        >
          Save
        </button>
      </div>
    </Dialog>
  );
}
