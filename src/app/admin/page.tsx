'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Save, ArrowLeft, ShieldAlert, Download, BellRing, Send, Check, X } from "lucide-react";

// 👇 Nur wer mit DIESER Email eingeloggt ist, darf die Seite sehen.
const ADMIN_EMAIL = "asad.jaryullah@gmail.com";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]); // <--- NEU
  const [saving, setSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // State für Push-Nachricht
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [sendingPush, setSendingPush] = useState(false);

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || user.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
        alert("Zugriff verweigert! Du bist nicht als Admin erkannt.");
        router.push('/'); 
        return;
      }

      setIsAuthorized(true);

      // 1. Daten laden (Gebetszeiten)
      const { data: prayersData } = await supabase.from('prayer_times').select('*').order('sort_order', { ascending: true });
      if (prayersData) setPrayers(prayersData);

      // 2. Nicht freigegebene User laden (NEU)
      await fetchPendingUsers();
      
      setLoading(false);
    };

    checkAdminAndLoadData();
  }, [router]);

  // Funktion: Neue User laden
  const fetchPendingUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', false) // Nur unbestätigte User
      .order('full_name', { ascending: true });
    
    if (data) setPendingUsers(data);
  };

  // Funktion: User freischalten
  const approveUser = async (id: string, name: string) => {
    if(!confirm(`${name} wirklich freischalten?`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', id);

    if (error) alert("Fehler: " + error.message);
    else {
      // Liste aktualisieren
      fetchPendingUsers();
    }
  };

  // Funktion: User ablehnen (löschen aus Profilen)
  const deleteUser = async (id: string) => {
    if(!confirm("User wirklich ablehnen/löschen?")) return;
    await supabase.from('profiles').delete().eq('id', id);
    fetchPendingUsers();
  };

  const handleTimeChange = (id: string, newTime: string) => {
    setPrayers(prayers.map(p => p.id === id ? { ...p, time: newTime } : p));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('prayer_times').upsert(prayers);
    setSaving(false);
    if (error) alert("Fehler: " + error.message);
    else alert("Zeiten erfolgreich gespeichert!");
  };

  const handleSendPush = async () => {
    if(!pushTitle || !pushMessage) return alert("Bitte Titel und Nachricht eingeben");
    if(!confirm(`Nachricht an ALLE senden?\n\nTitel: ${pushTitle}`)) return;
    setSendingPush(true);
    try {
      await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pushTitle, message: pushMessage })
      });
      alert("Nachricht wurde gesendet! 🚀");
      setPushTitle(""); setPushMessage("");
    } catch (e) { alert("Technischer Fehler beim Senden."); } 
    finally { setSendingPush(false); }
  };

  const downloadCsv = async (tableName: string) => {
    const { data } = await supabase.from(tableName).select('*');
    if (!data || data.length === 0) { alert("Keine Daten."); return; }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(header => `"${('' + row[header]).replace(/"/g, '\\"')}"`);
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${tableName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin h-10 w-10 text-slate-400 mb-4"/>
        <p className="text-slate-500">Lade Admin-Bereich...</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main className="min-h-screen bg-slate-100 p-6 flex flex-col items-center pb-20">
      
      {/* HEADER */}
      <div className="w-full max-w-md flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => router.push('/')}>
           <ArrowLeft className="mr-2 h-4 w-4" /> Zum Dashboard
        </Button>
        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-200 flex items-center gap-1">
          <ShieldAlert size={12}/> ADMIN AREA
        </span>
      </div>

      {/* --- NEU: NUTZER FREIGABE --- */}
      <Card className="w-full max-w-md shadow-md border-0 mb-6 bg-white border-l-4 border-l-blue-600">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Neue Anmeldungen</CardTitle>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{pendingUsers.length}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Keine offenen Anfragen.</p>
          ) : (
            pendingUsers.map((u) => (
              <div key={u.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                <div>
                  <p className="font-bold text-sm">{u.full_name}</p>
                  <p className="text-xs text-slate-500">{u.gender === 'male' ? 'Bruder' : 'Schwester'} • {u.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50 h-8 w-8" onClick={() => deleteUser(u.id)}>
                    <X size={16} />
                  </Button>
                  <Button size="icon" className="bg-green-600 hover:bg-green-700 h-8 w-8" onClick={() => approveUser(u.id, u.full_name)}>
                    <Check size={16} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {/* --------------------------- */}

      {/* 1. GEBETSZEITEN */}
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-red-600 mb-6">
        <CardHeader>
          <CardTitle>Gebetszeiten verwalten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prayers.map((prayer) => (
            <div key={prayer.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 w-24 capitalize">{prayer.name}</span>
              <Input 
                type="time" 
                value={prayer.time}
                onChange={(e) => handleTimeChange(prayer.id, e.target.value)}
                className="w-32 font-mono text-center text-lg border-slate-300 focus:ring-red-500"
              />
            </div>
          ))}
          <Button className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white h-12 text-lg" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-5 w-5" />}
            Speichern
          </Button>
        </CardContent>
      </Card>

      {/* 2. PUSH NACHRICHTEN */}
      <Card className="w-full max-w-md shadow-md border-0 mb-6 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2 text-slate-900">
            <BellRing className="text-blue-600" />
            <CardTitle className="text-lg">Nachricht an Alle</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input 
            placeholder="Titel (z.B. Wichtige Info)" 
            value={pushTitle}
            onChange={(e) => setPushTitle(e.target.value)}
          />
          <Input 
            placeholder="Nachricht (z.B. Eid Gebet ist um...)" 
            value={pushMessage}
            onChange={(e) => setPushMessage(e.target.value)}
          />
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSendPush} disabled={sendingPush}>
            {sendingPush ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2 h-4 w-4" />} 
            Jetzt Senden
          </Button>
        </CardContent>
      </Card>

      {/* 3. DATEN EXPORT */}
      <Card className="w-full max-w-md shadow-sm border-0 bg-slate-50">
        <CardHeader>
          <CardTitle className="text-base text-slate-500">Daten Export (CSV)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => downloadCsv('rides')} className="bg-white hover:bg-slate-100">
            <Download className="mr-2 h-4 w-4" /> Fahrten
          </Button>
          <Button variant="outline" onClick={() => downloadCsv('bookings')} className="bg-white hover:bg-slate-100">
            <Download className="mr-2 h-4 w-4" /> Buchungen
          </Button>
          <Button variant="outline" onClick={() => downloadCsv('profiles')} className="bg-white hover:bg-slate-100">
            <Download className="mr-2 h-4 w-4" /> Profile
          </Button>
          <Button variant="outline" onClick={() => downloadCsv('mosque_visits')} className="bg-white hover:bg-slate-100">
            <Download className="mr-2 h-4 w-4" /> Besuche
          </Button>
        </CardContent>
      </Card>

    </main>
  );
}