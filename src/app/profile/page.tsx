'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { User, Phone, Save, Loader2, ArrowLeft } from "lucide-react";
// 👇 HIER IST DIE KORREKTUR:
import NotificationManager from '@/components/NotificationManager'; 

export default function ProfilePage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phone: '' });
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
            phone: profile.phone || ''
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
          phone: formData.phone
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
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      
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
          {/* 1. DAS FORMULAR */}
          <form onSubmit={handleSave} className="space-y-4">
            
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

          {/* 2. DER PUSH BUTTON BEREICH (KORRIGIERT) */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Benachrichtigungen</h3>
            <p className="text-xs text-slate-500 mb-3">
              Erlaube Push-Nachrichten, um zu erfahren, wann der Fahrer ankommt.
            </p>
            {/* 👇 HIER WURDE DER NAME ANGEPASST */}
            <NotificationManager />
          </div>

        </CardContent>
      </Card>
    </main>
  );
}