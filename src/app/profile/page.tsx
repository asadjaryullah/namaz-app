'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { User, Phone, Save, Loader2, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: ''
  });

  // Daten laden
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

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
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  // Speichern
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.fullName,
        phone: formData.phone
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      alert("Fehler: " + error.message);
    } else {
      alert("Profil erfolgreich aktualisiert!");
      router.refresh(); // Damit die ProfileBar oben aktualisiert wird
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-8 w-8 text-slate-400"/></div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      
      {/* Header mit Zurück-Button */}
      <div className="w-full max-w-sm flex items-center mb-6 mt-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
        </Button>
      </div>

      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle>Profil bearbeiten</CardTitle>
          <CardDescription>Hier kannst du deine Kontaktdaten ändern.</CardDescription>
        </CardHeader>
        
        <CardContent>
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
        </CardContent>
      </Card>
    </main>
  );
}