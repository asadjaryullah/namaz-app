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
  const [formData, setFormData] = useState({ fullName: '', phone: '' });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) { router.push('/login'); return; }
      setUser(user);
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if(data) setFormData({ fullName: data.full_name || '', phone: data.phone || '' });
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: formData.fullName, phone: formData.phone }).eq('id', user.id);
    setSaving(false);
    if(error) alert(error.message);
    else { alert("Gespeichert!"); router.refresh(); }
  };

  if(loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin"/></div>;

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      <div className="w-full max-w-sm mb-6 mt-4"><Button variant="ghost" onClick={() => router.push('/')}><ArrowLeft className="mr-2"/> Zurück</Button></div>
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader><CardTitle>Profil bearbeiten</CardTitle><CardDescription>Ändere deine Daten</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="relative"><User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><Input value={formData.fullName} onChange={e=>setFormData({...formData, fullName: e.target.value})} className="pl-9" placeholder="Name"/></div>
            <div className="relative"><Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><Input value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="pl-9" placeholder="Handy"/></div>
            <Button className="w-full bg-slate-900 mt-4" disabled={saving}>{saving ? <Loader2 className="animate-spin mr-2"/> : "Speichern"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}