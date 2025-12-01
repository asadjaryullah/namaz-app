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

  // --- NEU: GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) alert("Google Login fehlgeschlagen: " + error.message);
  };
  // -------------------------

  const handleLogin = async (e: React.FormEvent) => {
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: fullName, phone: phone }
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Fehler aufgetreten.");
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
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">Anmelden</CardTitle>
          <CardDescription>Wähle eine Methode</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          
          {/* --- GOOGLE BUTTON --- */}
          {!sent && (
            <>
              <Button 
                variant="outline" 
                className="w-full h-12 text-md font-medium border-slate-300 hover:bg-slate-50 flex items-center gap-2"
                onClick={handleGoogleLogin}
              >
                {/* Google SVG Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" />
                  <path fill="#EA4335" d="M12 4.61c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Weiter mit Google
              </Button>

              <div className="flex items-center gap-2 text-xs text-slate-400 uppercase my-2">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span>oder per Email</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
            </>
          )}
          {/* --------------------- */}

          {sent ? (
            <div className="text-center space-y-4 py-4 animate-in zoom-in duration-300">
              <div className="flex justify-center text-green-600">
                <CheckCircle2 size={64} />
              </div>
              <h3 className="font-semibold text-xl">Email ist raus! 🚀</h3>
              <p className="text-slate-600">Link an <strong>{email}</strong> gesendet.</p>
              <Button variant="outline" className="w-full mt-4" onClick={() => setSent(false)}>Zurück</Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <User className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                        <Input className="pl-8" placeholder="Ali" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Handy <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <Phone className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                        <Input className="pl-8" placeholder="0176..." value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input type="email" placeholder="name@beispiel.de" className="pl-9 h-12 text-lg" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">{error}</div>}

              <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 mt-2 h-12 text-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2"/> : "Code anfordern"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}