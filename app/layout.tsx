import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import TopProgressBar from "@/components/TopProgressBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flora Studio | Mobile Florist CMS & WhatsApp Catalog",
  description: "Mobile-first floral catalog and management system for local florists.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flora Studio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 selection:bg-emerald-500 selection:text-white">
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
