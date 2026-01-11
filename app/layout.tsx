import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Diary",
  description: "AI Powered Journal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Diary",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Это критически важные теги для iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Diary" />
        {/* Ссылка на иконку для Apple */}
        <link rel="apple-touch-icon" href="/icon-512x512.png" />
      </head>
      <body className={`${inter.className} bg-background text-foreground antialiased overflow-hidden`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}