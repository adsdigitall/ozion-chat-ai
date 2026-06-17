"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  Building2,
  UserCog,
  CreditCard,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: MessageSquare, label: "Chat ao Vivo", href: "/chat" },
  { icon: Users, label: "CRM", href: "/crm" },
  { icon: GitBranch, label: "Fluxos", href: "/flows" },
  { icon: Bot, label: "Agentes IA", href: "/agents" },
  { icon: Mic, label: "Voice Studio", href: "/voice" },
  { icon: Radio, label: "CTWA", href: "/ctwa" },
  { icon: Megaphone, label: "Campanhas", href: "/campaigns" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: DollarSign, label: "Vendas", href: "/sales" },
  { icon: Plug, label: "Integrações", href: "/integrations" },
  { icon: Phone, label: "WhatsApp", href: "/whatsapp" },
];

const adminItems = [
  { icon: Building2, label: "Workspaces", href: "/workspaces" },
  { icon: UserCog, label: "Usuários", href: "/users" },
  { icon: CreditCard, label: "Planos", href: "/plans" },
  { icon: Settings, label: "Configurações", href: "/settings" },
  { icon: FileText, label: "Logs", href: "/logs" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden h-screen bg-zinc-950 border-r border-zinc-800 md:flex flex-col transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
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
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-800">
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Admin
            </p>
          )}
          <div className="space-y-1">
            {adminItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
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
      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
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
  const items = menuItems.slice(0, 5);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 px-2 pt-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-medium transition",
                isActive ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500"
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
