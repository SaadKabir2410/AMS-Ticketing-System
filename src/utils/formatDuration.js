// Shows decimal hours (e.g. 2.5) as "2h 30m"; callers still store hours for saving.
export const formatDurationHours = (hours) => {
  const totalMinutes = Math.round((parseFloat(hours) || 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};
