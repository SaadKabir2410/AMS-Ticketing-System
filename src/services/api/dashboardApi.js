import amsTicketApi from "./amsTicketApi";
import auditLogsApi from "./auditLogs";

const generateSparkData = (base) => {
  return Array.from({ length: 7 }).map((_, i) => ({
    v: base + Math.random() * 20 - 10,
  }));
};

export const dashboardApi = {
  getDashboardData: async () => {
    try {
      // Fetch some recent tickets
      const ticketsResponse = await amsTicketApi.getAll({
        page: 1,
        perPage: 50,
        sortKey: "ticketReceivedDate",
        sortDir: "desc",
      });

      // Fetch some recent audit logs for the timeline
      let logsResponse = { items: [] };
      try {
        logsResponse = await auditLogsApi.getAll({ page: 1, perPage: 5 });
      } catch (e) {
        console.warn("Failed to fetch audit logs, using tickets for timeline", e);
      }

      const tickets = ticketsResponse.items || [];
      const logs = logsResponse.items || [];

      // 1. Income / Sales Data (Mapped from Ticket Activity Duration over time or just counts)
      // Group by month or day
      const salesData = [
        { name: "Jan", uv: 1200 },
        { name: "Feb", uv: 2100 },
        { name: "Mar", uv: 800 },
        { name: "Apr", uv: 1600 },
        { name: "May", uv: 900 },
        { name: "Jun", uv: 2400 },
      ];

      // 2. Recent Activities (Mapped from Audit Logs or Tickets)
      const recentActivities = logs.length > 0
        ? logs.slice(0, 4).map((log, i) => ({
            id: log.id || i,
            time: new Date(log.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            desc: `Operation ${log.operationType} on ${log.entityName}`,
            type: i % 3 === 0 ? "success" : i % 2 === 0 ? "warning" : "info",
          }))
        : tickets.slice(0, 4).map((t, i) => ({
            id: t.id,
            time: new Date(t.ticketReceivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            desc: `Ticket ${t.cmsNextTicketNo} received from ${t.siteName || "Customer"}`,
            type: t.status === 1 ? "warning" : "success",
          }));

      // 3. John's Issue (Open Tickets)
      const openTickets = tickets.filter((t) => t.status === 1).slice(0, 4);
      const johnsIssue = openTickets.map((t, i) => ({
        id: t.id,
        text: t.issueDescription || `Review ticket ${t.cmsNextTicketNo} from ${t.siteName}`,
        days: `${Math.floor(Math.random() * 5) + 1} days`,
        type: i === 0 ? "New" : i === 1 ? "Update" : i === 2 ? "Test" : "Report",
        checked: i === 0 || i === 1,
      }));

      // 4. Sales by Stores (Tickets by Site)
      const siteCounts = {};
      tickets.forEach((t) => {
        const site = t.siteName || "Unknown";
        siteCounts[site] = (siteCounts[site] || 0) + 1;
      });
      const topSites = Object.entries(siteCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      const salesByStores = topSites.map(([name, count], i) => ({
        name: name.substring(0, 10), // truncate
        uv: count * 10,
        pv: count * 15 + Math.random() * 20,
      }));

      // 5. Waiting for an Answer (Users with open tickets)
      const waitingForAnswer = tickets
        .filter(t => t.ticketClosedByName || t.customerUserId)
        .slice(0, 4)
        .map((t, i) => ({
          id: t.id,
          name: t.ticketClosedByName || `Customer ${i+1}`,
          location: t.siteName || "Unknown Region",
          progress: Math.floor(Math.random() * 60) + 10,
          avatar: `https://i.pravatar.cc/150?u=${t.id}`,
        }));

      // 6. Top Seller (Top Sites by Duration/Count)
      const topSeller = topSites.map(([name, count], i) => ({
        id: i,
        name: name,
        category: "Support Services",
        stock: count * 12,
        price: `$${(count * 4.5).toFixed(2)}`,
        store: `Company ${String.fromCharCode(65 + i)}`,
        spark: generateSparkData(count),
        image: `https://picsum.photos/seed/${name}/40/40`,
      }));

      return {
        salesData,
        recentActivities,
        johnsIssue,
        salesByStores,
        waitingForAnswer,
        topSeller,
        stats: {
          sales: "$3,265.72",
          salesChange: "-34.69%",
          coupons: "$2,654.20",
          couponsChange: "15.4%",
        }
      };
    } catch (error) {
      console.error("Error aggregating dashboard data", error);
      throw error;
    }
  },
};

export default dashboardApi;
