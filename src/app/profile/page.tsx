'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
// Alle Icons (inkl. List & MessageSquareWarning)
import { User, Phone, Save, Loader2, ArrowLeft, Calendar, BadgeInfo, Lock, MessageSquareWarning, List } from "lucide-react";

import NotificationSettings from '@/components/NotificationSettings';
import LocationSettings from '@/components/LocationSettings'; 

// HIER DEINE NUMMER FÜR BUGS EINTRAGEN (Format: 49...)
const ADMIN_WHATSAPP = "+4915904273761"; 

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
  
  // Sperre für das Geschlecht
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

          // Wenn ein Geschlecht da ist, sperren wir es
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

  // Hilfsfunktion für Kalender-URLs (iPhone Fix)
  const openCalendar = (apiUrl: string) => {
    const host = window.location.host;
    // Wir erzwingen 'webcal://' (funktioniert am besten auf allen Geräten)
    const url = `webcal://${host}${apiUrl}`;
    window.location.href = url;
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
            
            {/* 1. GESCHLECHT AUSWAHL */}
            <div className="space-y-2">
              <div className="flex justify-between">
                 <label className="text-xs font-bold uppercase text-slate-500 ml-1">Geschlecht</label>
                 {isGenderLocked && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Lock size={10}/> Festgelegt</span>}
              </div>
              <div className={`grid grid-cols-2 gap-2 ${isGenderLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <div 
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

            {/* 2. ID NUMMER */}
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

            {/* 3. NAME */}
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

            {/* 4. HANDY */}
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

          {/* EINSTELLUNGEN */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-6">
            
            {/* PUSH */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Benachrichtigungen</h3>
              <p className="text-xs text-slate-500 mb-3">Erlaube Push-Nachrichten für Fahrten.</p>
              <NotificationSettings />
            </div>

            {/* GPS */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">GPS / Standort</h3>
              <p className="text-xs text-slate-500 mb-3">Wird benötigt, damit Fahrer und Mitfahrer sich finden.</p>
              <LocationSettings />
            </div>

            {/* KALENDER SYNC */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Kalender</h3>
              <p className="text-xs text-slate-500 mb-3">
                Wähle, was du im Handy-Kalender sehen möchtest.
              </p>
              
              <div className="flex flex-col gap-3">
                
                {/* Button 1: Veranstaltungen */}
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 border-orange-200 text-orange-800 bg-orange-50 hover:bg-orange-100"
                  onClick={() => openCalendar('/api/calendar-events')}
                >
                  <Calendar size={18} />
                  Veranstaltungen (Abo)
                </Button>

                {/* Button 2: Gebetszeiten */}
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 border-slate-300 text-slate-700"
                  onClick={() => openCalendar('/api/calendar')}
                >
                  <Calendar size={18} />
                  Gebetszeiten (Abo)
                </Button>
                
                {/* Button 3: Web-Liste (Der fehlende Button!) */}
                <Button 
                  variant="secondary" 
                  className="w-full justify-start gap-2 text-slate-600 bg-slate-100"
                  onClick={() => router.push('/events')}
                >
                  <List size={18} />
                  Liste ansehen (Web)
                </Button>

              </div>
            </div>

            {/* SUPPORT / BUG REPORT */}
            <div className="pt-4 border-t border-dashed border-slate-200">
               <h3 className="text-sm font-bold text-slate-900 mb-2">Hilfe & Support</h3>
               <a 
                 href={`https://wa.me/${ADMIN_WHATSAPP}?text=Salam, ich habe einen Fehler in der App gefunden:`}
                 target="_blank"
                 rel="noopener noreferrer"
               >
                 <Button variant="secondary" className="w-full justify-start gap-2 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200">
                    <MessageSquareWarning size={18} />
                    Fehler melden (WhatsApp)
                 </Button>
               </a>
            </div>

          </div>

        </CardContent>
      </Card>
    </main>
  );
}