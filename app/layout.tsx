import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { Inter, Lora } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin", "cyrillic"],
  variable: '--font-sans' 
});

const lora = Lora({ 
  subsets: ["latin", "cyrillic"],
  variable: '--font-serif' 
});

export const metadata = {
  title: "Diary",
  description: "AI Powered Journal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Diary",
  },
};

export const viewport = {
  // Важно: themeColor должен соответствовать фону, чтобы Safari закрасил системные зоны
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", 
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Добавляем lang="ru" и переменные шрифтов на самый верхний уровень
    <html lang="ru" className={`${inter.variable} ${lora.variable} h-full`}>
      <head>
        {/* Ключевой мета-тег для iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-512x512.png" />
      </head>
      {/* 1. Удаляем фиксированные w-screen h-screen из main, так как они могут обрезать фон. 
          2. Добавляем min-h-screen на body.
      */}
      <body className="bg-background text-foreground antialiased selection:bg-foreground selection:text-background min-h-full font-sans">
        <ClientLayout>
          {/* main теперь просто контейнер, который не мешает фону body */}
          <main className="relative">
            {children}
          </main>
        </ClientLayout>
      </body>
    </html>
  );
}