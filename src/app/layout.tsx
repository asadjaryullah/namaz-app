import type { Metadata, Viewport } from "next";
import "./globals.css";
import ProfileBar from "@/components/ProfileBar";

// 1. Hier stehen die Infos für die PWA (App-Name, Icon, Statusbar)
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

// 2. Das verhindert Zoomen auf Handys (fühlt sich wie echte App an)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

// 3. Das Haupt-Layout der Seite
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      {/* suppressHydrationWarning verhindert Fehler durch Browser-Plugins */}
      <body className="antialiased bg-slate-50" suppressHydrationWarning>
        
        {/* Die Leiste ist immer da, wenn man eingeloggt ist */}
        <ProfileBar />
        
        {/* Hier wird der Inhalt der jeweiligen Seite angezeigt */}
        {children}
      
      </body>
    </html>
  );
}