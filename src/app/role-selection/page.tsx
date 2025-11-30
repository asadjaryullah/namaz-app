'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, User } from "lucide-react";

export default function RoleSelectionPage() {
  const router = useRouter();

  const handleRoleSelect = (role: 'driver' | 'passenger') => {
    router.push(`/select-prayer?role=${role}`);
  };

  return (
    // Wir ändern das Layout auf min-h-screen mit flex-col, damit die Bar oben sitzt
    <main className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* 1. HIER IST DIE NEUE BAR */}

      {/* Der Rest der Seite zentriert */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Gute Fahrt! 🚕</h1>
          <p className="text-slate-500">Wie möchtest du heute zur Moschee?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          
          {/* KARTE: FAHRER */}
          <Card 
            className="p-8 flex flex-col items-center gap-4 cursor-pointer hover:border-slate-900 hover:shadow-lg transition-all border-2 border-transparent"
            onClick={() => handleRoleSelect('driver')}
          >
            <div className="bg-slate-100 p-6 rounded-full">
              <Car size={48} className="text-slate-900" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Ich bin Fahrer</h2>
              <p className="text-sm text-slate-500 mt-1">Ich biete Plätze an</p>
            </div>
            <Button className="mt-4 w-full bg-slate-900">Als Fahrer fortfahren</Button>
          </Card>

          {/* KARTE: MITFAHRER */}
          <Card 
            className="p-8 flex flex-col items-center gap-4 cursor-pointer hover:border-blue-600 hover:shadow-lg transition-all border-2 border-transparent"
            onClick={() => handleRoleSelect('passenger')}
          >
            <div className="bg-blue-50 p-6 rounded-full">
              <User size={48} className="text-blue-600" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Ich bin Mitfahrer</h2>
              <p className="text-sm text-slate-500 mt-1">Ich suche eine Fahrt</p>
            </div>
            <Button variant="outline" className="mt-4 w-full border-blue-200 text-blue-700 hover:bg-blue-50">Als Mitfahrer fortfahren</Button>
          </Card>

        </div>
      </div>
    </main>
  );
}