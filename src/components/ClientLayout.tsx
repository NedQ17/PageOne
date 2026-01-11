"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "@/components/ui/TabBar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Список страниц, где НЕ НУЖНО показывать нижнее меню
  const noBottomNav = ["/login"];
  const showTabBar = !noBottomNav.includes(pathname);

  return (
    <main className="relative h-[100dvh] max-w-screen-sm mx-auto flex flex-col shadow-2xl bg-background border-x border-border/5">
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
      {showTabBar && <TabBar />}
    </main>
  );
}