import {
  LayoutDashboard,
  Ticket,
  UserCircle,
  FileSliders,
  Table,
  Search,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    title: "Main Menu",
    links: [
      {
        id: "main-dashboard",
        name: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        id: "main-tickets",
        name: "AMS Tickets",
        href: "/ams-tickets",
        icon: Ticket,
      },
    ],
  },
  {
    title: "Management",
    links: [
      {
        id: "mgmt-report",
        name: "Reports",
        href: "/reports",
        icon: FileSliders,
        subMenu: [
          {
            id: "sub-reports-tickets",
            name: "AMS Tickets Report",
            href: "/reports/tickets",
          },
          {
            id: "sub-reports-afterhours",
            name: "After Working Hours Report",
            href: "/reports/after-hours",
          },
          {
            id: "sub-reports-commission",
            name: "Ticket Commission Report",
            href: "/reports/commission",
          },
        ],
      },
      {
        id: "mgmt-jobsheets",
        name: "Jobsheets",
        href: "/jobsheets",
        icon: Table,
      },
      {
        id: "lookup-master",
        name: "Lookups",
        icon: Search,
        subMenu: [
          {
            id: "lookup-hours",
            name: "User Working Hours",
            href: "/working-hours",
          },
          { id: "lookup-sites", name: "Sites", href: "/sites" },
          { id: "lookup-countries", name: "Countries", href: "/countries" },
          { id: "lookup-codes", name: "Work Done Codes", href: "/work-codes" },
          { id: "lookup-holidays", name: "Holidays", href: "/holidays" },
        ],
      },
    ],
  },
  {
    title: "Administration",
    links: [
      {
        id: "set-identity",
        name: "Identity Management",
        icon: UserCircle,
        subMenu: [{ id: "set-users", name: "Users", href: "/users" }],
      },
    ],
  },
];
