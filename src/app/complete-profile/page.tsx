'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Phone, Loader2, Save } from "lucide-react";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Wir holen den aktuellen User
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };
    getUser();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 5) {
        alert("Bitte eine gültige Nummer eingeben.");
        return;
    }
    
    setLoading(true);

    // Wir updaten NUR die Telefonnummer im Profil
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone })
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      alert("Fehler: " + error.message);
    } else {
      // Erfolgreich! Zurück zum Start
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-yellow-500">
        <CardHeader className="text-center">
          <div className="mx-auto bg-yellow-100 p-3 rounded-full w-fit mb-2">
            <Phone className="h-6 w-6 text-yellow-700" />
          </div>
          <CardTitle>Handynummer fehlt</CardTitle>
          <CardDescription>
            Damit dich Fahrer oder Mitfahrer erreichen können, benötigen wir noch deine Nummer.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Handy <span className="text-red-500">*</span></label>
                <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                      className="pl-9 h-12 text-lg" 
                      placeholder="0176 12345678" 
                      type="tel"
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      required 
                    />
                </div>
            </div>

            <Button type="submit" className="w-full bg-slate-900 text-white h-12 text-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2"/> : "Speichern & Weiter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}