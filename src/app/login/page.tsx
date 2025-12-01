'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ChevronLeft, Loader2, Mail, User, Phone, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Verhindert Neuladen der Seite
    
    // Zusätzlicher Check (obwohl 'required' im HTML das schon macht)
    if (!email || !fullName || !phone) {
        setError("Bitte fülle alle Felder aus.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            phone: phone
          }
        },
      });

      if (error) throw error;
      setSent(true);

    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      <div className="absolute top-6 left-6">
        <Button variant="ghost" onClick={() => router.push('/')}>
           <ChevronLeft className="mr-2 h-4 w-4" /> Startseite
        </Button>
      </div>

      <Card className="w-full max-w-sm shadow-xl border-slate-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Anmelden</CardTitle>
          <CardDescription>
            Wir senden dir einen Link per Email.<br/>
            Kein Passwort nötig.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4 py-4 animate-in zoom-in duration-300">
              <div className="flex justify-center text-green-600">
                <CheckCircle2 size={64} />
              </div>
              <h3 className="font-semibold text-xl">Email ist raus! 🚀</h3>
              <p className="text-slate-600">
                Checke dein Postfach (<strong>{email}</strong>).<br/>
                Klicke auf den Link, um dich anzumelden.
              </p>
              <Button variant="outline" className="w-full mt-4" onClick={() => setSent(false)}>
                Falsche Email? Zurück
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              
              <div className="grid grid-cols-1 gap-4">
                {/* NAME */}
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">
                      Vor- & Nachname <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                          className="pl-9" 
                          placeholder="Max Mustermann" 
                          value={fullName} 
                          onChange={e => setFullName(e.target.value)} 
                          required // <--- PFLICHTFELD
                        />
                    </div>
                </div>

                {/* TELEFON */}
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">
                      Handynummer <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                          className="pl-9" 
                          placeholder="0176 12345678" 
                          type="tel"
                          value={phone} 
                          onChange={e => setPhone(e.target.value)} 
                          required // <--- PFLICHTFELD
                        />
                    </div>
                </div>

                {/* EMAIL */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1">
                    Email Adresse <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      type="email" 
                      placeholder="name@beispiel.de" 
                      className="pl-9 h-12 text-lg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required // <--- PFLICHTFELD
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 mt-2 h-12 text-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2"/> : "Link anfordern ✨"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}