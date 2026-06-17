"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

const PUBLIC_ROUTES = ["/login", "/register"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-[100dvh] bg-zinc-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-zinc-950 pb-20 md:pb-0">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
