'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
// 👇 Lock Icon hinzugefügt
import { User, Phone, Save, Loader2, ArrowLeft, Calendar, BadgeInfo, Lock } from "lucide-react";

import NotificationSettings from '@/components/NotificationSettings';
import LocationSettings from '@/components/LocationSettings'; 

export default function ProfilePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({ 
    fullName: '', 
    phone: '', 
    gender: 'male', 
    memberId: '' 
  });
  const [userId, setUserId] = useState<string | null>(null);
  
  // HIER: Sperre für das Geschlecht
  const [isGenderLocked, setIsGenderLocked] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }
        
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setFormData({
            fullName: profile.full_name || '',
            phone: profile.phone || '',
            gender: profile.gender || 'male',
            memberId: profile.member_id || '' 
          });

          // Wenn ein Geschlecht da ist (und nicht leer), sperren wir es
          if (profile.gender) setIsGenderLocked(true);
        }
      } catch (err) {
        console.error("Fehler beim Laden:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: formData.fullName,
          phone: formData.phone,
          // Wir speichern das Geschlecht immer mit (falls es das erste Mal ist)
          gender: formData.gender, 
          member_id: formData.memberId
        });

      if (error) throw error;

      alert("Profil gespeichert!");
      router.refresh(); 
      router.push('/'); 
    } catch (error: any) {
      alert("Fehler: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin h-8 w-8 text-slate-400"/>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pb-20">
      
      <div className="w-full max-w-sm flex items-center mb-6 mt-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
        </Button>
      </div>

      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle>Profil bearbeiten</CardTitle>
          <CardDescription>Hier kannst du deine Daten ändern.</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            
            {/* GESCHLECHT AUSWAHL (MIT SPERRE) */}
            <div className="space-y-2">
              <div className="flex justify-between">
                 <label className="text-xs font-bold uppercase text-slate-500 ml-1">Geschlecht</label>
                 {isGenderLocked && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Lock size={10}/> Festgelegt</span>}
              </div>
              <div className={`grid grid-cols-2 gap-2 ${isGenderLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <div 
                  // Nur klickbar, wenn NICHT gesperrt
                  onClick={() => !isGenderLocked && setFormData({...formData, gender: 'male'})}
                  className={`rounded-xl border-2 p-3 text-center transition-all flex flex-col items-center gap-1 
                    ${formData.gender === 'male' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500'}
                    ${!isGenderLocked ? 'cursor-pointer hover:border-slate-300' : ''}`}
                >
                  <span className="text-xl">🧔🏻‍♂️</span>
                  <span className="text-sm font-bold">Bruder</span>
                </div>
                <div 
                  onClick={() => !isGenderLocked && setFormData({...formData, gender: 'female'})}
                  className={`rounded-xl border-2 p-3 text-center transition-all flex flex-col items-center gap-1
                    ${formData.gender === 'female' ? 'border-pink-600 bg-pink-600 text-white' : 'border-slate-200 text-slate-500'}
                    ${!isGenderLocked ? 'cursor-pointer hover:border-pink-200' : ''}`}
                >
                  <span className="text-xl">🧕🏻</span>
                  <span className="text-sm font-bold">Schwester</span>
                </div>
              </div>
            </div>

            {/* ID NUMMER */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 ml-1">ID-Nummer</label>
              <div className="relative">
                <BadgeInfo className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  value={formData.memberId}
                  onChange={(e) => setFormData({...formData, memberId: e.target.value})}
                  className="pl-9"
                  placeholder="z.B. 12345"
                />
              </div>
            </div>

            {/* NAME */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 ml-1">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="pl-9"
                  placeholder="Dein Name"
                />
              </div>
            </div>

            {/* TELEFON */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 ml-1">Handynummer</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="pl-9"
                  type="tel"
                  placeholder="0176..."
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-slate-900 mt-4" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
              Speichern
            </Button>

          </form>

          {/* SETTINGS */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Benachrichtigungen</h3>
              <p className="text-xs text-slate-500 mb-3">Erlaube Push-Nachrichten für Fahrten.</p>
              <NotificationSettings />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">GPS / Standort</h3>
              <p className="text-xs text-slate-500 mb-3">Wird benötigt, damit Fahrer und Mitfahrer sich finden.</p>
              <LocationSettings />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Kalender Sync</h3>
              <p className="text-xs text-slate-500 mb-3">Abonniere die Gebetszeiten direkt in deinen Kalender.</p>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-slate-300 text-slate-700"
                
                onClick={() => {
                // Wir erzwingen HTTPS und bauen die URL manuell sauber zusammen
                const protocol = window.location.protocol === 'http:' ? 'webcal:' : 'webcals:';
                const host = window.location.host;
                const calendarUrl = `${protocol}//${host}/api/calendar`;
                
                // Falls es auf Vercel läuft, erzwingen wir 'webcals' (das ist https für Kalender)
                if (host.includes('vercel.app')) {
                   window.location.href = `webcals://${host}/api/calendar`;
                } else {
                   window.location.href = calendarUrl;
                }
              }}
              >
                <Calendar size={18} />
                Kalender abonnieren
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </main>
  );
}