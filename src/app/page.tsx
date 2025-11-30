'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import MapComponent from '@/components/MapComponent'; 
import { Button } from "@/components/ui/button"; 

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col lg:flex-row items-center justify-center gap-8 p-6">
      
      {/* LINKER BEREICH: Logo & Buttons */}
      <div className="flex flex-col items-center text-center max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-lg lg:items-start lg:text-left">
        
        {/* Logo Bereich */}
        <div className="flex flex-col items-center lg:items-start">
          <div className="relative w-48 h-48 mb-4">
             {/* WICHTIG: Das Bild muss in deinem 'public' Ordner liegen */}
            <Image
              src="/way2bashier.png"
              alt="Namaz Taxi Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Namaz Taxi
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Gemeinsam & pünktlich zum Gebet in der Bashir Moschee.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4">
          <Button 
            size="lg" 
            className="w-full text-lg h-14 rounded-xl bg-slate-900 hover:bg-slate-800 transition-all shadow-md"
            onClick={() => router.push('/select-prayer')}
          >
            Fahrt suchen ➜
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">oder</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="lg"
            className="w-full h-12 rounded-xl border-slate-300 text-slate-600 hover:bg-slate-50"
            onClick={() => router.push('/login')}
          >
            Anmelden
          </Button>
        </div>
      </div>

      {/* RECHTER BEREICH: Karte (Bensheim fest) */}
      <div className="w-full max-w-md lg:max-w-xl h-[400px] lg:h-[600px] rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-slate-200">
        <MapComponent />
        
        <div className="bg-white p-3 text-center border-t">
          <p className="text-sm font-medium text-green-700 flex items-center justify-center gap-2">
            📍 Ziel: Bashir Moschee, Bensheim
          </p>
        </div>
      </div>

    </main>
  );
}