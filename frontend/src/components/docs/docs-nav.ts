import {
  BookOpen,
  Code2,
  HelpCircle,
  Layers,
  MessageSquareQuote,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";

export const DOCS_NAV = [
  { href: "/docs", label: "Welcome", icon: BookOpen, exact: true as const },
  { href: "/docs/about", label: "About the project", icon: Sparkles, exact: false as const },
  { href: "/docs/getting-started", label: "Getting started", icon: Rocket, exact: false as const },
  { href: "/docs/features", label: "Features", icon: Layers, exact: false as const },
  { href: "/docs/tutor", label: "AI tutor", icon: MessageSquareQuote, exact: false as const },
  { href: "/docs/contributors", label: "Contributors", icon: Users, exact: false as const },
  { href: "/docs/faq", label: "FAQ", icon: HelpCircle, exact: false as const },
  { href: "/docs/api", label: "API reference", icon: Code2, exact: false as const },
] as const;

import { LIVE_APP_URL } from "@/lib/brand";

export { LIVE_APP_URL };
