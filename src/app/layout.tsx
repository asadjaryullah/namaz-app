import type { Metadata, Viewport } from "next";
import "./globals.css";
import ProfileBar from "@/components/ProfileBar";
import NotificationManager from "@/components/NotificationManager";

export const metadata: Metadata = {
  title: "Namaz Taxi",
  description: "Gemeinsam zur Moschee",
  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Namaz Taxi",
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
      <body className="antialiased bg-slate-50 flex flex-col min-h-screen" suppressHydrationWarning>
        
        {/* Komponenten, die immer da sind */}
        <ProfileBar />
        <NotificationManager />
        
        {/* Inhalt der aktuellen Seite */}
        <div className="flex-1">
          {children}
        </div>

        {/* Footer */}
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