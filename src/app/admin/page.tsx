'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Save,
  ArrowLeft,
  ShieldAlert,
  Download,
  CalendarPlus,
  Trash2,
  Check,
  X,
  MapPin,
  BellRing,
} from "lucide-react";

// 👇 Nur wer mit DIESER Email eingeloggt ist, darf die Seite sehen.
const ADMIN_EMAIL = "asad.jaryullah@gmail.com";

type Org = 'ansar' | 'khuddam' | 'atfal' | 'lajna' | 'nasirat' | 'jamaat';

const ORG_LABEL: Record<Org, string> = {
  jamaat: 'Jamaat',
  ansar: 'Ansar',
  khuddam: 'Khuddam',
  atfal: 'Atfal',
  lajna: 'Lajna',
  nasirat: 'Nasirat',
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Daten States
  const [prayers, setPrayers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Inputs für neue Events
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventStart, setNewEventStart] = useState("");
  const [newEventEnd, setNewEventEnd] = useState("");
  const [newEventOrg, setNewEventOrg] = useState<Org>('jamaat');

  const [saving, setSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Push states
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [sendingPush, setSendingPush] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || user.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
        alert("Zugriff verweigert! Du bist nicht als Admin erkannt.");
        router.push('/');
        return;
      }

      setIsAuthorized(true);

      // Gebetszeiten
      const { data: prayersData } = await supabase
        .from('prayer_times')
        .select('*')
        .order('sort_order', { ascending: true });
      if (prayersData) setPrayers(prayersData);

      // Pending Users
      await fetchPendingUsers();

      // Events
      await fetchEvents();

      setLoading(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('mosque_events')
      .select('*')
      .order('event_date', { ascending: true });
    if (data) setEvents(data);
  };

  // --- USER FREIGABE ---
  const fetchPendingUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', false)
      .order('full_name', { ascending: true });
    if (data) setPendingUsers(data);
  };

  const approveUser = async (id: string, name: string) => {
    if (!confirm(`${name} freischalten?`)) return;
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    if (error) alert("Fehler: " + error.message);
    else fetchPendingUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("User ablehnen/löschen?")) return;
    await supabase.from('profiles').delete().eq('id', id);
    fetchPendingUsers();
  };

  // --- EVENTS ---
  const handleAddEvent = async () => {
    if (!newEventTitle || !newEventStart) {
      alert("Bitte Titel und Startdatum angeben");
      return;
    }

    setSaving(true);
    try {
      // Wenn kein Ende angegeben, nehmen wir Start + 2 Stunden
      let endIso: string;
      if (!newEventEnd) {
        const d = new Date(newEventStart);
        d.setHours(d.getHours() + 2);
        endIso = d.toISOString();
      } else {
        endIso = new Date(newEventEnd).toISOString();
      }

      const startIso = new Date(newEventStart).toISOString();

      const { error } = await supabase.from('mosque_events').insert({
        title: newEventTitle.trim(),
        location: (newEventLocation || "Bashir Moschee").trim(),
        org: newEventOrg,
        event_date: startIso,
        event_end_date: endIso,
      });

      if (error) {
        alert("Fehler: " + error.message);
        return;
      }

      // reset
      setNewEventTitle("");
      setNewEventLocation("");
      setNewEventStart("");
      setNewEventEnd("");
      setNewEventOrg("jamaat");

      await fetchEvents();
      alert("Termin hinzugefügt ✅");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Termin löschen?")) return;
    await supabase.from('mosque_events').delete().eq('id', id);
    setEvents(events.filter(e => e.id !== id));
  };

  // --- GEBETSZEITEN ---
  const handleTimeChange = (id: string, newTime: string) => {
    setPrayers(prayers.map(p => p.id === id ? { ...p, time: newTime } : p));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('prayer_times').upsert(prayers);
    setSaving(false);
    if (error) alert("Fehler: " + error.message);
    else alert("Zeiten gespeichert ✅");
  };

  // --- PUSH ---
  const handleSendPush = async () => {
    if (!pushTitle || !pushMessage) return alert("Bitte Titel und Text angeben.");

    setSendingPush(true);
    try {
      const secret = process.env.NEXT_PUBLIC_ADMIN_PUSH_SECRET;
      if (!secret) throw new Error("NEXT_PUBLIC_ADMIN_PUSH_SECRET fehlt (env)");

      const res = await fetch(`/api/send-push?secret=${encodeURIComponent(secret)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pushTitle, message: pushMessage }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Request failed");

      alert("Gesendet ✅");
      setPushTitle("");
      setPushMessage("");
    } catch (e: any) {
      alert("Fehler beim Senden: " + (e?.message || "unbekannt"));
    } finally {
      setSendingPush(false);
    }
  };

  // --- EXPORT CSV ---
  const downloadCsv = async (tableName: string) => {
    const { data } = await supabase.from(tableName).select('*');
    if (!data || data.length === 0) { alert("Keine Daten."); return; }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header =>
        `"${('' + (row as any)[header] || '').replace(/"/g, '\\"')}"`
      );
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${tableName}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin h-10 w-10 text-slate-400 mb-4" />
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
          <ShieldAlert size={12} /> ADMIN AREA
        </span>
      </div>

      {/* 1. NUTZER FREIGABE */}
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
                  <p className="text-xs text-slate-500">{u.gender === 'male' ? 'Bruder' : 'Schwester'} • {u.member_id || 'Keine ID'}</p>
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

      {/* 2. VERANSTALTUNGEN */}
      <Card className="w-full max-w-md shadow-md border-0 mb-6 bg-white border-l-4 border-l-orange-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarPlus className="text-orange-500" />
            <CardTitle>Veranstaltungen</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* NEW EVENT FORM */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500">Neuer Termin:</label>

            <Input
              placeholder="Titel (z.B. Ijtema / Jalsa / Tarbiyyat)"
              value={newEventTitle}
              onChange={e => setNewEventTitle(e.target.value)}
            />

            {/* Location */}
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Ort (z.B. Bashir Moschee)"
                value={newEventLocation}
                onChange={e => setNewEventLocation(e.target.value)}
              />
            </div>

            {/* Org Dropdown */}
            <label className="text-[10px] text-slate-500 uppercase font-bold">Unterorganisation</label>
            <select
              value={newEventOrg}
              onChange={(e) => setNewEventOrg(e.target.value as Org)}
              className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="jamaat">Jamaat</option>
              <option value="ansar">Ansar</option>
              <option value="khuddam">Khuddam</option>
              <option value="atfal">Atfal</option>
              <option value="lajna">Lajna</option>
              <option value="nasirat">Nasirat</option>
            </select>

            {/* Start / End */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold">Start</label>
                <Input
                  type="datetime-local"
                  value={newEventStart}
                  onChange={e => setNewEventStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold">Ende (Optional)</label>
                <Input
                  type="datetime-local"
                  value={newEventEnd}
                  onChange={e => setNewEventEnd(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleAddEvent}
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              Hinzufügen
            </Button>
          </div>

          {/* LIST */}
          <div className="pt-4 border-t space-y-2">
            <label className="text-xs font-bold text-slate-500 mb-2 block">Geplante Termine:</label>

            {events.length === 0 ? (
              <p className="text-sm text-slate-400">Keine Termine.</p>
            ) : events.map(e => (
              <div key={e.id} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm border">
                <div>
                  <p className="font-bold">{e.title}</p>

                  {/* Org */}
                  {e.org && (
                    <p className="text-[10px] font-bold uppercase text-slate-500 mt-0.5">
                      {ORG_LABEL[(e.org as Org) ?? 'jamaat']}
                    </p>
                  )}

                  {/* Location */}
                  {e.location && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {e.location}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(e.event_date).toLocaleString('de-DE')}
                    {e.event_end_date ? ` – ${new Date(e.event_end_date).toLocaleString('de-DE')}` : ''}
                  </p>
                </div>

                <button onClick={() => handleDeleteEvent(e.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2b. PUSH */}
      <Card className="w-full max-w-md shadow-md border-0 mb-6 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2 text-slate-900">
            <BellRing className="text-blue-600" />
            <CardTitle>Push Nachricht</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Titel" value={pushTitle} onChange={e => setPushTitle(e.target.value)} />
          <Input placeholder="Text" value={pushMessage} onChange={e => setPushMessage(e.target.value)} />

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSendPush}
            disabled={sendingPush}
          >
            {sendingPush ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Senden
          </Button>
        </CardContent>
      </Card>

      {/* 3. GEBETSZEITEN */}
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-red-600 mb-6">
        <CardHeader><CardTitle>Gebetszeiten</CardTitle></CardHeader>
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
          <Button
            className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white h-12 text-lg"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
            Speichern
          </Button>
        </CardContent>
      </Card>

      {/* 4. EXPORT */}
      <Card className="w-full max-w-md shadow-sm border-0 bg-slate-50">
        <CardHeader><CardTitle className="text-base text-slate-500">Daten Export (CSV)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => downloadCsv('rides')}><Download className="mr-2 h-4 w-4" /> Fahrten</Button>
          <Button variant="outline" onClick={() => downloadCsv('bookings')}><Download className="mr-2 h-4 w-4" /> Buchungen</Button>
          <Button variant="outline" onClick={() => downloadCsv('profiles')}><Download className="mr-2 h-4 w-4" /> Profile</Button>
          <Button variant="outline" onClick={() => downloadCsv('mosque_visits')}><Download className="mr-2 h-4 w-4" /> Besuche</Button>
        </CardContent>
      </Card>

    </main>
  );
}