import type { Metadata, Viewport } from "next";
import { Amiri } from "next/font/google"; 
import Image from "next/image"; // <--- WICHTIG: Image importieren
import "./globals.css";
import ProfileBar from "@/components/ProfileBar";
import NotificationManager from "@/components/NotificationManager";

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
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
      <body className={`antialiased bg-slate-50 flex flex-col min-h-screen ${amiri.variable}`} suppressHydrationWarning>
        
        <ProfileBar />
        <NotificationManager />
        
        {/* Hauptinhalt füllt den verfügbaren Platz */}
        <div className="flex-1">
          {children}
        </div>

        {/* --- FOOTER --- */}
        <footer className="py-8 text-center text-slate-400 text-xs mt-4 border-t border-slate-100/50">
          
          {/* JUBILÄUMSLOGO (Klein & Dezent) */}
          <div className="flex justify-center mb-3">
            <div className="relative w-14 h-14 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              {/* Stelle sicher, dass das Bild 'jubilaeum.png' im 'public' Ordner liegt */}
              <Image 
                src="/jubilaeum.png" 
                alt="100 Jahre Jubiläum" 
                fill 
                className="object-contain"
              />
            </div>
          </div>

          <p className="mb-2 font-medium">© {new Date().getFullYear()} Ride 2 Salah</p>
          
          <div className="flex justify-center gap-4">
            <a href="/impressum" className="hover:text-slate-600 transition-colors underline-offset-4 hover:underline">
              Impressum
            </a>
            <a href="#" className="hover:text-slate-600 transition-colors underline-offset-4 hover:underline">
              Datenschutz
           <footer className="py-8 text-center text-slate-400 text-xs mt-4 border-t border-slate-100/50">
          
          {/* ... Logo ... */}

          <p className="mb-2 font-medium">© {new Date().getFullYear()} Ride 2 Salah</p>
          
          <div className="flex justify-center gap-4">
            <a href="/impressum" className="hover:underline">Impressum</a>
            {/* HIER DEN LINK ÄNDERN: */}
            <a href="/datenschutz" className="hover:underline">Datenschutz</a>
          </div>
        </footer> </a>
          </div>
        </footer>

      </body>
    </html>
  );
}