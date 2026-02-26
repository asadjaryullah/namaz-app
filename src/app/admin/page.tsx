'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  ChevronDown,
} from "lucide-react";

// 👇 Nur wer mit DIESER Email eingeloggt ist, darf die Seite sehen.
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

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
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'events' | 'system'>('users');

  // Push states
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [sendingPush, setSendingPush] = useState(false);

  // Cron-Test states
  const [cronLogs, setCronLogs] = useState<string[]>([]);
  const [cronTesting, setCronTesting] = useState(false);

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
        location: (newEventLocation || "Bashier Moschee").trim(),
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Nicht eingeloggt.");

      const res = await fetch(`/api/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

  // --- CRON TEST ---
  const handleCronTest = async (mode: 'debug' | 'force') => {
    setCronTesting(true);
    setCronLogs([]);
    try {
      const secret = "asad0260_2026";
      const params = mode === 'force'
        ? `secret=${secret}&force=1`
        : `secret=${secret}&debug=1`;
      const res = await fetch(`/api/schedule-notifications?${params}`);
      const json = await res.json().catch(() => ({}));
      setCronLogs(json.logs || [`Status ${res.status}: Keine Logs`]);
    } catch (e: any) {
      setCronLogs([`Fehler: ${e?.message || 'unbekannt'}`]);
    } finally {
      setCronTesting(false);
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
    <main className="min-h-screen bg-slate-100 flex flex-col items-center pb-20">

      {/* HEADER — sticky, kompakt */}
      <div className="w-full bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.push('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold text-slate-800">Admin-Bereich</h1>
        <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
          <ShieldAlert size={10} /> ADMIN
        </span>
      </div>

      <div className="w-full max-w-md p-4 space-y-4">

        {/* TABS */}
        <div className="flex gap-1.5">
          {([
            ['users',  '👥', 'Anmeldungen'],
            ['events', '📅', 'Termine'],
            ['system', '⚙️', 'System'],
          ] as const).map(([tab, icon, label]) => (
            <button
              key={tab}
              onClick={() => setActiveAdminTab(tab)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-2xl transition-all flex flex-col items-center gap-0.5
                ${activeAdminTab === tab
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200'}`}
            >
              <span className="text-base">{icon}</span>
              <span className="text-[10px] uppercase tracking-wide">{label}</span>
              {tab === 'users' && pendingUsers.length > 0 && (
                <span className={`text-[9px] font-black px-1.5 rounded-full ${activeAdminTab === 'users' ? 'bg-white text-slate-900' : 'bg-red-500 text-white'}`}>
                  {pendingUsers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: ANMELDUNGEN ── */}
        {activeAdminTab === 'users' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm font-bold text-slate-700">Alles erledigt</p>
                <p className="text-xs text-slate-400 mt-1">Keine offenen Anfragen.</p>
              </div>
            ) : (
              pendingUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 shrink-0">
                    {u.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-slate-400">{u.gender === 'male' ? 'Bruder' : 'Schwester'} · {u.member_id || 'Keine ID'}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="w-9 h-9 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <X size={15} />
                    </button>
                    <button
                      onClick={() => approveUser(u.id, u.full_name)}
                      className="w-9 h-9 rounded-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center transition-colors"
                    >
                      <Check size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB: TERMINE ── */}
        {activeAdminTab === 'events' && (
          <div className="space-y-4 animate-in fade-in duration-200">

            {/* Formular */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Neuer Termin</p>

              <Input
                placeholder="Titel (z.B. Ijtema / Jalsa)"
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                className="bg-slate-50 border-slate-200"
              />

              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9 bg-slate-50 border-slate-200"
                  placeholder="Ort (optional)"
                  value={newEventLocation}
                  onChange={e => setNewEventLocation(e.target.value)}
                />
              </div>

              <select
                value={newEventOrg}
                onChange={(e) => setNewEventOrg(e.target.value as Org)}
                className="w-full h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
              >
                <option value="jamaat">Jamaat</option>
                <option value="ansar">Ansar</option>
                <option value="khuddam">Khuddam</option>
                <option value="atfal">Atfal</option>
                <option value="lajna">Lajna</option>
                <option value="nasirat">Nasirat</option>
              </select>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Start</label>
                  <Input type="datetime-local" value={newEventStart} onChange={e => setNewEventStart(e.target.value)} className="bg-slate-50 border-slate-200" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Ende</label>
                  <Input type="datetime-local" value={newEventEnd} onChange={e => setNewEventEnd(e.target.value)} className="bg-slate-50 border-slate-200" />
                </div>
              </div>

              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleAddEvent} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CalendarPlus size={15} className="mr-2" />}
                Hinzufügen
              </Button>
            </div>

            {/* Eventliste */}
            {(() => {
              const now = new Date();
              const upcomingEvents = events.filter(e => new Date(e.event_end_date || e.event_date) >= now);
              const pastEvents = events.filter(e => new Date(e.event_end_date || e.event_date) < now).reverse();

              const EventRow = ({ e }: { e: any }) => (
                <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-900">{e.title}</p>
                      {e.org && (
                        <span className="text-[9px] font-black uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                          {ORG_LABEL[(e.org as Org) ?? 'jamaat']}
                        </span>
                      )}
                    </div>
                    {e.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {e.location}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(e.event_date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteEvent(e.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                    <Trash2 size={15} />
                  </button>
                </div>
              );

              return (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Kommend ({upcomingEvents.length})</p>
                  {upcomingEvents.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center bg-white rounded-xl p-4 border border-slate-200">Keine kommenden Termine.</p>
                  ) : (
                    upcomingEvents.map(e => <EventRow key={e.id} e={e} />)
                  )}

                  {pastEvents.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowPastEvents(v => !v)}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 mt-1 transition-colors"
                      >
                        <ChevronDown size={13} className={`transition-transform duration-200 ${showPastEvents ? 'rotate-180' : ''}`} />
                        {showPastEvents ? 'Ausblenden' : `${pastEvents.length} vergangene anzeigen`}
                      </button>
                      {showPastEvents && (
                        <div className="mt-2 space-y-2 opacity-50">
                          {pastEvents.map(e => <EventRow key={e.id} e={e} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── TAB: SYSTEM ── */}
        {activeAdminTab === 'system' && (
          <div className="space-y-4 animate-in fade-in duration-200">

            {/* Gebetszeiten */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Gebetszeiten</p>
              <div className="space-y-2">
                {prayers.map((prayer) => (
                  <div key={prayer.id} className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700 text-sm capitalize w-20">{prayer.name}</span>
                    <Input
                      type="time"
                      value={prayer.time}
                      onChange={(e) => handleTimeChange(prayer.id, e.target.value)}
                      className="w-28 font-mono text-center border-slate-200 bg-white h-9"
                    />
                  </div>
                ))}
              </div>
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save size={15} className="mr-2" />}
                Speichern
              </Button>
            </div>

            {/* Push */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <BellRing size={12} /> Push Nachricht
              </p>
              <Input placeholder="Titel" value={pushTitle} onChange={e => setPushTitle(e.target.value)} className="bg-slate-50 border-slate-200" />
              <Input placeholder="Text" value={pushMessage} onChange={e => setPushMessage(e.target.value)} className="bg-slate-50 border-slate-200" />
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSendPush} disabled={sendingPush}>
                {sendingPush ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Senden
              </Button>
            </div>

            {/* Cron / Push Diagnose */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <BellRing size={12} /> Cron / Push Diagnose
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => handleCronTest('debug')}
                  disabled={cronTesting}
                  className="text-xs"
                >
                  {cronTesting ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : null}
                  Debug (trocken)
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCronTest('force')}
                  disabled={cronTesting}
                  className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {cronTesting ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : null}
                  Push sofort senden
                </Button>
              </div>
              {cronLogs.length > 0 && (
                <div className="bg-slate-950 rounded-xl p-3 space-y-0.5 max-h-48 overflow-y-auto">
                  {cronLogs.map((log, i) => (
                    <p key={i} className={`text-[11px] font-mono leading-relaxed
                      ${log.startsWith('✅') ? 'text-green-400' :
                        log.startsWith('❌') ? 'text-red-400' :
                        log.startsWith('⚠️') ? 'text-yellow-400' :
                        'text-slate-400'}`}>
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Download size={12} /> Export (CSV)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadCsv('rides')} className="text-xs justify-start">
                  <Download size={12} className="mr-1.5" /> Fahrten
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadCsv('bookings')} className="text-xs justify-start">
                  <Download size={12} className="mr-1.5" /> Buchungen
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadCsv('profiles')} className="text-xs justify-start">
                  <Download size={12} className="mr-1.5" /> Profile
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadCsv('mosque_visits')} className="text-xs justify-start">
                  <Download size={12} className="mr-1.5" /> Besuche
                </Button>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
