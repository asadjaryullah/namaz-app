import type { Metadata, Viewport } from "next";
import { Amiri, Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";

import { Toaster } from "sonner";

// Components
import ProfileBar from "@/components/ProfileBar";
import MosqueDetector from "@/components/MosqueDetector";
import InstallPrompt from "@/components/InstallPrompt";
import PushManager from "@/components/PushManager";

// Provider
import { AuthProvider } from "@/providers/AuthProvider";

/* ── FONTS ── */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
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
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#07070e" },
    { media: "(prefers-color-scheme: light)", color: "#f5f0e8" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Dark mode init — runs before hydration to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('r2s-theme');
              var d = document.documentElement;
              if (t === 'dark') { d.setAttribute('data-theme','dark'); }
              else if (t === 'light') { d.setAttribute('data-theme','light'); }
              // 'system' or null → CSS media query handles it automatically
            } catch(e) {}
          })();
        `}} />
      </head>
      <body
        className={`antialiased flex flex-col min-h-screen geo-pattern ${jakarta.variable} ${amiri.variable} ${dmMono.variable}`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {/* Background services */}
          <PushManager />
          <InstallPrompt />
          <MosqueDetector />

          {/* Navigation */}
          <ProfileBar />

          {/* Main */}
          <div className="flex-1 relative z-10">{children}</div>

          {/* Toasts */}
          <Toaster richColors position="bottom-center" />

          {/* Footer */}
          <footer className="relative z-10 pt-8 text-center text-xs mt-4" style={{ color: 'var(--app-text3)', borderTop: '1px solid var(--app-border)', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
            <div className="flex justify-center mb-3">
              <div className="relative w-12 h-12 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer">
                <Image
                  src="/jubilaeum.png"
                  alt="100 Jahre Jubiläum"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            <p className="mb-2 font-semibold" style={{ color: 'var(--app-text2)' }}>
              © {new Date().getFullYear()} Ride 2 Salah
            </p>

            <div className="flex justify-center gap-4">
              <a href="/impressum" className="hover:underline underline-offset-4 transition-colors py-2 px-3" style={{ color: 'var(--app-text2)' }}>
                Impressum
              </a>
              <a href="/datenschutz" className="hover:underline underline-offset-4 transition-colors py-2 px-3" style={{ color: 'var(--app-text2)' }}>
                Datenschutz
              </a>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
