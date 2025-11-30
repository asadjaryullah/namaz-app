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
      <body className="antialiased bg-slate-50 flex flex-col min-h-screen" suppressHydrationWarning>
        <ProfileBar />
        
        {/* Inhalt füllt den Platz */}
        <div className="flex-1">
          {children}
        </div>

        {/* Footer */}
        <footer className="py-6 text-center text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} Namaz Taxi Bensheim</p>
          <div className="mt-2 space-x-3">
            <a href="/impressum" className="hover:underline">Impressum</a>
            <a href="/datenschutz" className="hover:underline">Datenschutz</a>
          </div>
        </footer>

      </body>
    </html>
  );
}