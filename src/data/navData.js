import {
  Home,
  Ticket,
  FileText,
  Briefcase,
  Database,
  Shield,
  Settings,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    title: "Main Menu",
    links: [
      // { id: "main-Home", name: "Home", href: "/", icon: Home },
      {
        id: "main-tickets",
        name: "AMS Tickets",
        href: "/ams-tickets",
        icon: Ticket,
        permission: "Billing.AMSTickets",
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
        icon: FileText,
        permission: "Billing.Reports",
        subMenu: [
          {
            id: "sub-reports-tickets",
            name: "AMS Tickets Report",
            href: "/reports/tickets",
            permission: "Billing.Reports.AMSTicketsReport",
          },
          {
            id: "sub-reports-general",
            name: "General Report",
            href: "/reports/general",
          },
          {
            id: "sub-reports-afterhours",
            name: "After Working Hours Report",
            href: "/reports/after-hours",
            permission: "Billing.Reports.AfterWorkingHoursReport",
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
        icon: Briefcase,
        permission: "Billing.Jobsheets",
      },
      {
        id: "lookup-master",
        name: "Lookups",
        icon: Database,
        subMenu: [
          {
            id: "lookup-hours",
            name: "User Working Hours",
            href: "/working-hours",
            permission: "Billing.UserWorkingHours",
          },
          {
            id: "lookup-sites",
            name: "Sites",
            href: "/sites",
            permission: "Billing.Sites",
          },
          {
            id: "lookup-countries",
            name: "Countries",
            href: "/countries",
            permission: "Billing.Countries",
          },
          {
            id: "lookup-codes",
            name: "Work Done Codes",
            href: "/work-codes",
            permission: "Billing.WorkDoneCodes",
          },
          {
            id: "lookup-holidays",
            name: "Holidays",
            href: "/holidays",
            permission: "Billing.Holidays",
          },
          {
            id: "lookup-codes-new",
            name: "Codes",
            href: "/codes",
            permission: "Billing.Lookups",
          },
          {
            id: "lookup-code-details",
            name: "Code Details",
            href: "/code-details",
            permission: "Billing.Lookups",
          },
          {
            id: "lookup-task-categories",
            name: "Task Category Projects",
            href: "/task-category-projects",
            permission: "Billing.TaskCategoryProjects",
          },
        ],
      },
    ],
  },
  {
    title: " Administration",
    links: [
      {
        id: "set-identity",
        name: "Identity Management",
        icon: Shield,
        subMenu: [
          {
            id: "set-users",
            name: "Users",
            href: "/users",
            permission: "AbpIdentity.Users",
          },
          {
            id: "set-roles",
            name: "Roles",
            href: "/roles",
            permission: "AbpIdentity.Roles",
          },
        ],
      },
      {
        id: "set-settings",
        name: "Settings",
        icon: Settings,
        href: "/settings",
        permission: "AbpSettingManagement.Emailing",
      },
    ],
  },
];
