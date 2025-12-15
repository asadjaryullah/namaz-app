'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { User, Phone, Save, Loader2, ArrowLeft, Calendar, BadgeInfo } from "lucide-react";

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
            
            {/* GESCHLECHT AUSWAHL */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 ml-1">Geschlecht</label>
              <div className="grid grid-cols-2 gap-2">
                <div 
                  onClick={() => setFormData({...formData, gender: 'male'})}
                  className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-all flex flex-col items-center gap-1 select-none
                    ${formData.gender === 'male' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <span className="text-xl">🧔🏻‍♂️</span>
                  <span className="text-sm font-bold">Bruder</span>
                </div>
                <div 
                  onClick={() => setFormData({...formData, gender: 'female'})}
                  className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-all flex flex-col items-center gap-1 select-none
                    ${formData.gender === 'female' ? 'border-pink-600 bg-pink-600 text-white' : 'border-slate-200 text-slate-500 hover:border-pink-200'}`}
                >
                  <span className="text-xl">🧕🏻</span>
                  <span className="text-sm font-bold">Schwester</span>
                </div>
              </div>
            </div>

            {/* --- ID NUMMER (Text geändert) --- */}
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
                  const calendarUrl = window.location.origin.replace('https', 'webcal').replace('http', 'webcal') + '/api/calendar';
                  window.location.href = calendarUrl;
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