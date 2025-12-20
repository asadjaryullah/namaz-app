'use client';

import { Button } from "@/components/ui/button";
import { WifiOff, RotateCcw } from "lucide-react";
import Image from "next/image";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      
      <div className="bg-slate-100 p-6 rounded-full mb-6 animate-pulse">
        <WifiOff className="h-12 w-12 text-slate-400" />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">Keine Verbindung</h1>
      
      <p className="text-slate-500 mb-8 max-w-xs">
        Du bist offline. Aber keine Sorge: Deine Gebete werden trotzdem angenommen! 🤲
      </p>

      <div className="relative w-20 h-20 mb-8 opacity-50 grayscale">
         <Image src="/jubilaeum.png" alt="Logo" fill className="object-contain" />
      </div>

      <Button 
        className="w-full max-w-xs bg-slate-900 text-white" 
        onClick={() => window.location.reload()}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Erneut versuchen
      </Button>

    </main>
  );
}