import type { Metadata, Viewport } from "next";
import { Amiri } from "next/font/google";
import Image from "next/image";
import "./globals.css";

import { Toaster } from "sonner";

// Components
import ProfileBar from "@/components/ProfileBar";
import MosqueDetector from "@/components/MosqueDetector";
import InstallPrompt from "@/components/InstallPrompt";
import OneSignalInit from "@/components/OneSignalInit";

// Provider
import { AuthProvider } from "@/providers/AuthProvider";

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
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body
        className={`antialiased bg-slate-50 flex flex-col min-h-screen ${amiri.variable}`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {/* Background services */}
          <OneSignalInit />
          <InstallPrompt />
          <MosqueDetector />

          {/* Navigation */}
          <ProfileBar />

          {/* Main */}
          <div className="flex-1">{children}</div>

          {/* Toasts */}
          <Toaster richColors position="bottom-center" />

          {/* Footer */}
          <footer className="py-8 text-center text-slate-400 text-xs mt-4 border-t border-slate-100/50">
            <div className="flex justify-center mb-3">
              <div className="relative w-14 h-14 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer">
                <Image
                  src="/jubilaeum.png"
                  alt="100 Jahre Jubiläum"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            <p className="mb-2 font-medium">
              © {new Date().getFullYear()} Ride 2 Salah
            </p>

            <div className="flex justify-center gap-4">
              <a
                href="/impressum"
                className="hover:text-slate-600 transition-colors underline-offset-4 hover:underline"
              >
                Impressum
              </a>
              <a
                href="/datenschutz"
                className="hover:text-slate-600 transition-colors underline-offset-4 hover:underline"
              >
                Datenschutz
              </a>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}