"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "@/components/ui/TabBar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Список страниц, где НЕ НУЖНО показывать нижнее меню
  const noBottomNav = ["/login"];
  const showTabBar = !noBottomNav.includes(pathname);

  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased overflow-hidden">
        {/* h-[100dvh] — динамическая высота, которая учитывает мобильный интерфейс */}
        <main className="relative h-[100dvh] max-w-screen-sm mx-auto flex flex-col shadow-2xl bg-background border-x border-border/5">
          <div className="flex-1 overflow-hidden relative">
            {children}
          </div>
          
          {showTabBar && <TabBar />}
        </main>
      </body>
    </html>
  );
}