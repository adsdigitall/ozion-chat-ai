"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { canAccessModule } from "@/lib/auth/access-control";
import { canAccess, type NavItemConfig } from "@/lib/auth/permissions";
import { useAuthStore } from "@/lib/stores/auth";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Bot,
  Mic,
  Radio,
  Megaphone,
  BarChart3,
  DollarSign,
  Plug,
  Phone,
  Tag,
  Building2,
  UserCog,
  CreditCard,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  Zap,
  BriefcaseBusiness,
} from "lucide-react";
import { useState } from "react";

const menuItems: NavItemConfig[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", permission: "dashboard.view", module: "dashboard" },
  { icon: MessageSquare, label: "Chat ao Vivo", href: "/chat", permission: "chat.view", module: "chat" },
  { icon: Users, label: "CRM", href: "/crm", permission: "crm.view", module: "crm" },
  { icon: Tag, label: "Tags", href: "/tags", permission: "crm.view", module: "crm" },
  { icon: GitBranch, label: "Fluxos", href: "/flows", permission: "flows.view", module: "flows" },
  { icon: Bot, label: "Agentes IA", href: "/agents", permission: "agents.view", module: "agents" },
  { icon: Mic, label: "Voice Studio", href: "/voice", permission: "voice.view", module: "voice" },
  { icon: Radio, label: "CTWA", href: "/ctwa", permission: "ctwa.view", module: "ctwa" },
  { icon: Megaphone, label: "Campanhas", href: "/campaigns", permission: "campaigns.view", module: "campaigns" },
  { icon: BarChart3, label: "Analytics", href: "/analytics", permission: "analytics.view", module: "analytics" },
  { icon: DollarSign, label: "Vendas", href: "/sales", permission: "sales.view", module: "sales" },
  { icon: Plug, label: "Integrações", href: "/integrations", permission: "integrations.view", module: "integrations" },
  { icon: Phone, label: "WhatsApp", href: "/whatsapp", permission: "whatsapp.view", module: "whatsapp" },
];

const adminItems: NavItemConfig[] = [
  { icon: BriefcaseBusiness, label: "Clientes", href: "/customers", permission: "customers.view" },
  { icon: Building2, label: "Workspaces", href: "/workspaces", permission: "workspaces.view" },
  { icon: UserCog, label: "Usuários", href: "/users", permission: "users.view" },
  { icon: CreditCard, label: "Planos", href: "/plans", permission: "plans.view" },
  { icon: Settings, label: "Configurações", href: "/settings", permission: "settings.view" },
  { icon: FileText, label: "Logs", href: "/logs", permission: "logs.view" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions;
  const visibleMenuItems = menuItems.filter((item) => {
    if (permissions && !canAccess(permissions, item.permission)) return false;
    return item.module ? canAccessModule(user, item.module) : true;
  });
  const visibleAdminItems = adminItems.filter((item) => !permissions || canAccess(permissions, item.permission));

  return (
    <aside
      className={cn(
        "oz-sidebar hidden h-screen border-r md:flex flex-col transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_28px_rgba(16,185,129,0.28)]">
            <Zap className="w-4 h-4 text-zinc-950" />
          </div>
          {!collapsed && (
            <span className="text-white font-semibold text-lg tracking-tight">
              Ozion
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20"
                    : "text-zinc-400 hover:bg-zinc-900/80 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-800/80">
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              Admin
            </p>
          )}
          <div className="space-y-1">
            {visibleAdminItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20"
                      : "text-zinc-400 hover:bg-zinc-900/80 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Collapse button */}
      <div className="p-3 border-t border-zinc-800/80">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="pulse-button oz-button-secondary w-full flex items-center justify-center gap-2 px-3 py-2"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions;
  const items = menuItems
    .filter((item) => {
      if (permissions && !canAccess(permissions, item.permission)) return false;
      return item.module ? canAccessModule(user, item.module) : true;
    })
    .slice(0, 5);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-[#050807]/95 px-2 pt-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-medium transition",
                isActive ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20" : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
              )}
            >
              <item.icon className="mb-1 h-5 w-5" />
              <span className="max-w-full truncate">{item.label.replace(" ao Vivo", "")}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
