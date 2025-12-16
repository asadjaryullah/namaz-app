import type { Metadata, Viewport } from "next";
import { Amiri } from "next/font/google"; 
import Image from "next/image"; 
import "./globals.css";

// Wir importieren sie, nutzen sie aber gleich erst mal NICHT
import ProfileBar from "@/components/ProfileBar";
import NotificationManager from "@/components/NotificationManager";
import MosqueDetector from "@/components/MosqueDetector";
import InstallPrompt from "@/components/InstallPrompt"; 
import OneSignalInit from "@/components/OneSignalInit";

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
        
        {/* --- FEHLERSUCHE: ALLES AUSKOMMENTIERT --- */}
        {/* <OneSignalInit /> */}
        {/* <InstallPrompt /> */}
        {/* <NotificationManager /> */}
        {/* <MosqueDetector /> */}
        
        {/* <ProfileBar /> */}
        
        {/* --- HAUPTINHALT (Das muss sichtbar sein!) --- */}
        <div className="flex-1 flex flex-col">
           {/* Notfall-Header, damit du dich orientieren kannst */}
           <div className="bg-red-100 text-red-800 p-2 text-center text-xs font-bold">
             DEBUG MODUS
           </div>
           {children}
        </div>

        {/* --- FOOTER --- */}
        <footer className="py-8 text-center text-slate-400 text-xs mt-4 border-t border-slate-100/50">
          <p className="mb-2 font-medium">© {new Date().getFullYear()} Ride 2 Salah</p>
        </footer>

      </body>
    </html>
  );
}