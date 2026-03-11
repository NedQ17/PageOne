"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { TabBar } from "@/components/ui/TabBar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const noBottomNav = ["/login"];
  const showTabBar = !noBottomNav.includes(pathname);

  useEffect(() => {
    const html = document.documentElement;
    html.style.fontSize = '14px';
    return () => { html.style.fontSize = ''; };
  }, [pathname]);

  return (
    <main className="relative h-[100dvh] max-w-screen-sm mx-auto flex flex-col shadow-2xl bg-background border-x border-border/5">
      <div className="flex-1 relative flex flex-col min-h-0">
        {children}
      </div>
      {showTabBar && <TabBar />}
    </main>
  );
}
