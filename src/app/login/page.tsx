'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ChevronLeft, Loader2, Mail, User, Phone, KeyRound } from "lucide-react";
import OneSignal from 'react-onesignal'; 

export default function LoginPage() {
  const router = useRouter();
  
  // ZUSTAND: 'input' (Daten eingeben) ODER 'verify' (Code eingeben)
  const [step, setStep] = useState<'input' | 'verify'>('input');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formular Daten
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('male');
  
  // Der Code
  const [otp, setOtp] = useState('');

  // SCHRITT 1: Code anfordern
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
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
          // Daten speichern für neue User
          data: {
            full_name: fullName,
            phone: phone,
            gender: gender
          }
          // WICHTIG: Wir brauchen keinen Redirect mehr, da wir den Code manuell eingeben
        },
      });

      if (error) throw error;
      
      // Erfolgreich gesendet -> Umschalten auf Code-Eingabe
      setStep('verify');

    } catch (err: any) {
      setError(err.message || "Fehler beim Senden.");
    } finally {
      setLoading(false);
    }
  };

  // SCHRITT 2: Code bestätigen
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Hier prüfen wir den Code manuell
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email'
      });

      if (error) throw error;

      // Erfolg! OneSignal Login triggern
      if (data.user && typeof window !== 'undefined') {
        try { OneSignal.login(data.user.id); } catch(e) {}
      }

      // Weiterleitung ins Dashboard
      router.push('/'); 

    } catch (err: any) {
      setError("Der Code ist falsch oder abgelaufen.");
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
          <CardTitle className="text-2xl font-bold">
            {step === 'input' ? 'Anmelden' : 'Code eingeben'}
          </CardTitle>
          <CardDescription>
            {step === 'input' 
              ? 'Wir senden dir einen Code per Email.' 
              : `Code wurde an ${email} gesendet.`}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          
          {/* --- ANSICHT 1: DATEN EINGEBEN --- */}
          {step === 'input' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              
              {/* Geschlecht */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Geschlecht *</label>
                <div className="grid grid-cols-2 gap-2">
                  <div 
                    onClick={() => setGender('male')}
                    className={`cursor-pointer rounded-lg border p-2 text-center text-sm font-bold flex flex-col items-center transition-all ${gender === 'male' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    <span>🧔🏻‍♂️ Bruder</span>
                  </div>
                  <div 
                    onClick={() => setGender('female')}
                    className={`cursor-pointer rounded-lg border p-2 text-center text-sm font-bold flex flex-col items-center transition-all ${gender === 'female' ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    <span>🧕🏻 Schwester</span>
                  </div>
                </div>
              </div>

              {/* Formularfelder */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">Vor- & Nachname *</label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input className="pl-9" placeholder="Max Mustermann" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">Handynummer *</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input className="pl-9" placeholder="0176..." type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1">Email Adresse *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input type="email" placeholder="name@beispiel.de" className="pl-9 h-12 text-lg" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
              </div>

              {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">{error}</div>}

              <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 mt-2 h-12 text-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2"/> : "Code anfordern ✨"}
              </Button>
            </form>
          )}

          {/* --- ANSICHT 2: CODE EINGEBEN --- */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-6 animate-in slide-in-from-right duration-300">
              
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">6-stelliger Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    type="text" 
                    placeholder="123456" 
                    className="pl-9 h-14 text-2xl tracking-widest font-mono text-center" 
                    maxLength={6}
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    required 
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-1">Schau in dein Email-Postfach.</p>
              </div>

              {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">{error}</div>}

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2"/> : "Code bestätigen 🚀"}
              </Button>
              
              <div className="text-center">
                <Button variant="link" className="text-slate-400 text-xs" onClick={() => setStep('input')}>
                  Falsche Email? Zurück
                </Button>
              </div>
            </form>
          )}

        </CardContent>
      </Card>
    </main>
  );
}