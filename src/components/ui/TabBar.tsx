"use client";

import { MessageSquare, Library, BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const TabBar = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Today', href: '/', icon: MessageSquare },
    { name: 'Interview', href: '/interview', icon: Sparkles }, // Новый раздел
   // { name: 'Shell', href: '/shell', icon: Library },
    { name: 'Diary', href: '/diary', icon: BookOpen },
  ];

  return (
    <nav className="bg-background border-t border-border/40 px-4 pb-4 z-50 transition-colors duration-300 ">
      <div className="flex justify-around items-center h-14 max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex flex-col items-center gap-1 flex-1 transition-all ${
                isActive ? 'text-foreground scale-105' : 'text-muted-foreground/40'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[8px] font-bold uppercase tracking-wider">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};