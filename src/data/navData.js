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
    Table
} from "lucide-react";

export const NAV_GROUPS = [
    {
        title: "Main Menu",
        links: [
            { id: "main-dashboard", name: "Dashboard", href: "/", icon: LayoutDashboard },
            { id: "main-tickets", name: "AMS Tickets", href: "/ams-tickets", icon: Ticket },
            { id: "main-customers", name: "Clients", href: "/Clients", icon: Users }
        ]
    },
    {
        title: "Management",
        links: [
            {
                id: "mgmt-report", name: "Reports", href: "/reports", icon: FileSliders,
                subMenu: [
                    { id: "sub-reports-tickets", name: "AMS Tickets Report", href: "/reports/tickets" },
                    { id: "sub-reports-commission", name: "Tickets Comission Report", href: "/reports/commission" },
                ]
            },
            { id: "mgmt-jobsheets", name: "Jobsheets", href: "/jobsheets", icon: Table },
            { id: "mgmt-hours", name: "User Working Hours", href: "/working-hours", icon: Hourglass },
            { id: "mgmt-sites", name: "Sites", href: "/sites", icon: AudioWaveform },
            { id: "mgmt-countries", name: "Countries", href: "/countries", icon: Globe },
            { id: "mgmt-codes", name: "Work Codes", href: "/work-codes", icon: SquareDashedBottomCode },
            { id: "mgmt-holidays", name: "Holidays", href: "/holidays", icon: Balloon },
        ]
    },
    {
        title: "Administration",
        links: [
            { id: "set-profile", name: "Identity Management", href: "/profile", icon: UserCircle },
            { id: "set-config", name: "Users", href: "/users", icon: Users },
            { id: "set-configuration", name: "Configuration", href: "/configuration", icon: Settings },
            { id: "set-security", name: "Security", href: "/security", icon: ShieldCheck },
        ]
    }
];