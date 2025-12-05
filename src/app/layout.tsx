import type { Metadata, Viewport } from "next";
import { Amiri } from "next/font/google"; // <--- 1. IMPORTIEREN
import "./globals.css";
import ProfileBar from "@/components/ProfileBar";
import NotificationManager from "@/components/NotificationManager";

// 2. SCHRIFT KONFIGURIEREN
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri", // Wir machen eine Variable daraus
});

export const metadata: Metadata = {
  title: "Ride 2 Salah",
  description: "Gemeinsam zur Moschee",
  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ride 2 Salah",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      {/* 3. VARIABLE HIER EINFÜGEN */}
      <body className={`antialiased bg-slate-50 ${amiri.variable}`} suppressHydrationWarning>
        <ProfileBar />
        <NotificationManager />
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-6 text-center text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} Namaz Taxi Bensheim</p>
          <div className="mt-2 space-x-3">
            <a href="#" className="hover:underline">Impressum</a>
            <a href="#" className="hover:underline">Datenschutz</a>
          </div>
        </footer>
      </body>
    </html>
  );
}