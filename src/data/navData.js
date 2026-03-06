import {
  LayoutDashboard,
  Hourglass,
  Home,
  Globe,
  AudioWaveform,
  SquareDashedBottomCode,
  Balloon,
  Ticket,
  Users,
  Settings,
  ShieldCheck,
  UserCircle,
  FileSliders,
  Table,
  History,
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
      { id: "main-customers", name: "Clients", href: "/Clients", icon: Users },
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
        id: "set-profile",
        name: "Identity Management",
        href: "/profile",
        icon: UserCircle,
      },
      { id: "set-config", name: "Users", href: "/users", icon: Users },
      {
        id: "set-configuration",
        name: "Configuration",
        href: "/configuration",
        icon: Settings,
      },
      {
        id: "set-security",
        name: "Security",
        href: "/security",
        icon: ShieldCheck,
      },
      {
        id: "set-audit",
        name: "Audit Logs",
        href: "/audit-logs",
        icon: History,
      },
    ],
  },
];
