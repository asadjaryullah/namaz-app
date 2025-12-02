'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Save, ArrowLeft, ShieldAlert } from "lucide-react";

// 👇 HIER IST DIE E-MAIL (Zeile 12)
// Nur wer mit DIESER Email eingeloggt ist, darf die Seite sehen.
const ADMIN_EMAIL = "asad.jaryullah@gmail.com";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      // 1. User prüfen
      const { data: { user } } = await supabase.auth.getUser();

      // Debugging: Damit du in der Konsole (F12) siehst, wer eingeloggt ist
      console.log("Eingeloggt als:", user?.email);
      console.log("Erwarte Admin:", ADMIN_EMAIL);

      // Sicherheits-Check: Stimmt die Email?
      if (!user || user.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
        alert("Zugriff verweigert! Du bist nicht als Admin erkannt.");
        router.push('/'); 
        return;
      }

      setIsAuthorized(true);

      // 2. Daten laden (wenn Admin)
      const { data, error } = await supabase
        .from('prayer_times')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) console.error("DB Fehler:", error);
      if (data) setPrayers(data);
      
      setLoading(false);
    };

    checkAdminAndLoadData();
  }, [router]);

  const handleTimeChange = (id: string, newTime: string) => {
    setPrayers(prayers.map(p => p.id === id ? { ...p, time: newTime } : p));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('prayer_times').upsert(prayers);
    setSaving(false);

    if (error) {
      alert("Fehler: " + error.message);
    } else {
      alert("Gespeichert!");
    }
  };

  // LADEBILDSCHIRM
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin h-10 w-10 text-slate-400 mb-4"/>
        <p className="text-slate-500">Prüfe Admin-Rechte...</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main className="min-h-screen bg-slate-100 p-6 flex flex-col items-center">
      
      <div className="w-full max-w-md flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => router.push('/')}>
           <ArrowLeft className="mr-2 h-4 w-4" /> Zum Dashboard
        </Button>
        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-200 flex items-center gap-1">
          <ShieldAlert size={12}/> ADMIN AREA
        </span>
      </div>

      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-red-600">
        <CardHeader>
          <CardTitle>Gebetszeiten verwalten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {prayers.map((prayer) => (
            <div key={prayer.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 w-24 capitalize">{prayer.name}</span>
              <Input 
                type="time" 
                value={prayer.time}
                onChange={(e) => handleTimeChange(prayer.id, e.target.value)}
                className="w-32 font-mono text-center text-lg border-slate-300 focus:ring-red-500"
              />
            </div>
          ))}

          <Button 
            className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white h-12 text-lg"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-5 w-5" />}
            Speichern
          </Button>

        </CardContent>
      </Card>
    </main>
  );
}