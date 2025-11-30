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
  
  // Wir speichern jetzt mehr als nur die Email
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Wir senden die Zusatzdaten (Name, Phone) als "options" mit
    const { error } = await supabase.auth.signInWithOtp({
      email: formData.email,
      options: {
        emailRedirectTo: `${window.location.origin}/role-selection`,
        data: {
          full_name: formData.fullName,
          phone: formData.phone
        }
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
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
          <CardTitle className="text-2xl font-bold">Anmeldung</CardTitle>
          <CardDescription>
            Bitte fülle deine Daten aus, um dich anzumelden oder zu registrieren.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center text-green-600">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="font-semibold text-lg">Fast geschafft!</h3>
              <p className="text-slate-600 text-sm">
                Wir haben einen Link an <strong>{formData.email}</strong> geschickt.<br/>
                Klicke in der Email auf den Link, um fortzufahren.
              </p>
              <Button variant="outline" className="w-full mt-4" onClick={() => setSent(false)}>
                Eingabe korrigieren
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* NAME */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Vollständiger Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Max Mustermann" 
                    className="pl-9"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* TELEFON */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Handynummer</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="0176 12345678" 
                    className="pl-9"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Email Adresse</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email" 
                    placeholder="deine@email.com" 
                    className="pl-9"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 mt-2" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sende...</> : "Code anfordern"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}