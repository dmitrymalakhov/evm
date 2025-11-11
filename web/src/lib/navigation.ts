import { Compass, LayoutDashboard, MessageSquare, Radio, Ticket } from "lucide-react";

export const NAV_LINKS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Levels",
    href: "/levels/3",
    icon: Compass,
  },
  {
    label: "Team",
    href: "/team",
    icon: MessageSquare,
  },
  {
    label: "Feed",
    href: "/feed",
    icon: Radio,
  },
  {
    label: "Tickets",
    href: "/tickets",
    icon: Ticket,
  },
];

