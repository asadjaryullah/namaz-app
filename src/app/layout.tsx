import type { Metadata, Viewport } from "next";
import { Amiri } from 'next/font/google'; // <--- NEU
import "./globals.css";
import ProfileBar from "@/components/ProfileBar";

// Arabische Schriftart konfigurieren
const amiri = Amiri({ 
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
});

// ... metadata & viewport bleiben gleich ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      {/* Schriftart Variable hinzufügen */}
      <body className={`antialiased bg-slate-50 ${amiri.variable}`} suppressHydrationWarning>
        <ProfileBar />
        {children}
      </body>
    </html>
  );
}