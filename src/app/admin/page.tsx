'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2, Save, ArrowLeft, ShieldAlert, Download, CalendarPlus,
  Trash2, Check, X, MapPin, BellRing, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

type Org = 'ansar' | 'khuddam' | 'atfal' | 'lajna' | 'nasirat' | 'jamaat';

const ORG_LABEL: Record<Org, string> = {
  jamaat: 'Jamaat', ansar: 'Ansar', khuddam: 'Khuddam',
  atfal: 'Atfal', lajna: 'Lajna', nasirat: 'Nasirat',
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [prayers, setPrayers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventStart, setNewEventStart] = useState("");
  const [newEventEnd, setNewEventEnd] = useState("");
  const [newEventOrg, setNewEventOrg] = useState<Org>('jamaat');

  const [saving, setSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'events' | 'system'>('users');

  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [sendingPush, setSendingPush] = useState(false);

  const [cronLogs, setCronLogs] = useState<string[]>([]);
  const [cronTesting, setCronTesting] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!ADMIN_EMAIL || !user || user.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
        toast.error("Zugriff verweigert! Du bist nicht als Admin erkannt.");
        router.push('/');
        return;
      }
      setIsAuthorized(true);

      const { data: prayersData } = await supabase.from('prayer_times').select('id,name,time,sort_order').order('sort_order', { ascending: true });
      if (prayersData) setPrayers(prayersData);

      await fetchPendingUsers();
      await fetchEvents();
      setLoading(false);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('mosque_events').select('id,title,location,org,event_date,event_end_date').order('event_date', { ascending: true });
    if (data) setEvents(data);
  };

  const fetchPendingUsers = async () => {
    const { data } = await supabase.from('profiles').select('id,full_name,gender,member_id,is_approved').eq('is_approved', false).order('full_name', { ascending: true });
    if (data) setPendingUsers(data);
  };

  const approveUser = async (id: string, name: string) => {
    toast(`${name} freischalten?`, {
      action: {
        label: "Freischalten ✅",
        onClick: async () => {
          const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
          if (error) toast.error("Fehler: " + error.message);
          else { toast.success(`${name} wurde freigeschaltet!`); fetchPendingUsers(); }
        },
      },
      cancel: { label: "Abbrechen", onClick: () => {} },
    });
  };

  const deleteUser = async (id: string) => {
    toast("User ablehnen/löschen?", {
      action: {
        label: "Löschen ❌",
        onClick: async () => {
          await supabase.from('profiles').delete().eq('id', id);
          fetchPendingUsers();
        },
      },
      cancel: { label: "Abbrechen", onClick: () => {} },
    });
  };

  const handleAddEvent = async () => {
    if (!newEventTitle || !newEventStart) { toast.error("Bitte Titel und Startdatum angeben."); return; }
    setSaving(true);
    try {
      let endIso: string;
      if (!newEventEnd) {
        const d = new Date(newEventStart);
        d.setHours(d.getHours() + 2);
        endIso = d.toISOString();
      } else {
        endIso = new Date(newEventEnd).toISOString();
      }
      const { error } = await supabase.from('mosque_events').insert({
        title: newEventTitle.trim(),
        location: (newEventLocation || "Bashier Moschee").trim(),
        org: newEventOrg,
        event_date: new Date(newEventStart).toISOString(),
        event_end_date: endIso,
      });
      if (error) { toast.error("Fehler: " + error.message); return; }
      setNewEventTitle(""); setNewEventLocation(""); setNewEventStart(""); setNewEventEnd(""); setNewEventOrg("jamaat");
      await fetchEvents();
      toast.success("Termin hinzugefügt!");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    toast("Termin löschen?", {
      action: {
        label: "Löschen ❌",
        onClick: async () => {
          await supabase.from('mosque_events').delete().eq('id', id);
          setEvents(events.filter(e => e.id !== id));
        },
      },
      cancel: { label: "Abbrechen", onClick: () => {} },
    });
  };

  const handleTimeChange = (id: string, newTime: string) => {
    setPrayers(prayers.map(p => p.id === id ? { ...p, time: newTime } : p));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('prayer_times').upsert(prayers);
    setSaving(false);
    if (error) toast.error("Fehler: " + error.message);
    else toast.success("Gebetszeiten gespeichert!");
  };

  const handleSendPush = async () => {
    if (!pushTitle || !pushMessage) { toast.error("Bitte Titel und Text angeben."); return; }
    setSendingPush(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Nicht eingeloggt.");
      const res = await fetch(`/api/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: pushTitle, message: pushMessage }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Request failed");
      toast.success("Push-Nachricht gesendet!");
      setPushTitle(""); setPushMessage("");
    } catch (e: any) {
      toast.error("Fehler beim Senden: " + (e?.message || "unbekannt"));
    } finally {
      setSendingPush(false);
    }
  };

  const handleCronTest = async (mode: 'debug' | 'force') => {
    setCronTesting(true); setCronLogs([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Nicht eingeloggt.");
      const res = await fetch('/api/admin/cron-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json().catch(() => ({}));
      setCronLogs(json.logs || [`Status ${res.status}: Keine Logs`]);
    } catch (e: any) {
      setCronLogs([`Fehler: ${e?.message || 'unbekannt'}`]);
    } finally {
      setCronTesting(false);
    }
  };

  const downloadCsv = async (tableName: string) => {
    const { data } = await supabase.from(tableName).select('*');
    if (!data || data.length === 0) { toast.info("Keine Daten zum Exportieren."); return; }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(header => `"${('' + (row as any)[header] || '').replace(/"/g, '\\"')}"`);
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${tableName}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <Loader2 className="animate-spin h-10 w-10 mb-4" style={{ color: 'var(--app-text3)' }} />
        <p style={{ color: 'var(--app-text2)' }}>Lade Admin-Bereich...</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main className="min-h-screen flex flex-col items-center pb-20" style={{ background: 'var(--app-bg)' }}>

      {/* HEADER */}
      <div className="w-full px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'var(--app-surface1)', borderBottom: '1px solid var(--app-border)', boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
        <button className="h-9 w-9 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
          style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}
          onClick={() => router.push('/')}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold" style={{ color: 'var(--app-text)' }}>Admin-Bereich</h1>
        <span className="text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1"
          style={{ background: 'rgba(240,98,146,0.12)', border: '1px solid rgba(240,98,146,0.3)', color: 'var(--app-rose)' }}>
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
              className="flex-1 py-2.5 text-sm font-bold rounded-2xl transition-all flex flex-col items-center gap-0.5"
              style={{
                background: activeAdminTab === tab ? 'var(--app-text)' : 'var(--app-surface2)',
                color: activeAdminTab === tab ? 'var(--app-bg)' : 'var(--app-text2)',
                border: `1px solid ${activeAdminTab === tab ? 'transparent' : 'var(--app-border)'}`,
              }}
            >
              <span className="text-base">{icon}</span>
              <span className="text-[10px] uppercase tracking-wide">{label}</span>
              {tab === 'users' && pendingUsers.length > 0 && (
                <span className="text-[9px] font-black px-1.5 rounded-full bg-red-500 text-white">
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
              <div className="text-center py-12 rounded-2xl" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>Alles erledigt</p>
                <p className="text-xs mt-1" style={{ color: 'var(--app-text3)' }}>Keine offenen Anfragen.</p>
              </div>
            ) : (
              pendingUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
                    style={{ background: 'var(--app-card)', color: 'var(--app-text2)' }}>
                    {u.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: 'var(--app-text)' }}>{u.full_name}</p>
                    <p className="text-xs" style={{ color: 'var(--app-text3)' }}>{u.gender === 'male' ? 'Bruder' : 'Schwester'} · {u.member_id || 'Keine ID'}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => deleteUser(u.id)}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(240,98,146,0.1)', color: 'var(--app-rose)' }}>
                      <X size={15} />
                    </button>
                    <button onClick={() => approveUser(u.id, u.full_name)}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-green-500 hover:bg-green-600 text-white">
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

            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--app-text3)' }}>Neuer Termin</p>

              <Input placeholder="Titel (z.B. Ijtema / Jalsa)" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} />
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--app-text3)' }} />
                <Input className="pl-9" placeholder="Ort (optional)" value={newEventLocation} onChange={e => setNewEventLocation(e.target.value)} />
              </div>
              <select
                value={newEventOrg}
                onChange={(e) => setNewEventOrg(e.target.value as Org)}
                className="w-full h-10 rounded-md px-3 text-sm"
                style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
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
                  <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--app-text3)' }}>Start</label>
                  <Input type="datetime-local" value={newEventStart} onChange={e => setNewEventStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--app-text3)' }}>Ende</label>
                  <Input type="datetime-local" value={newEventEnd} onChange={e => setNewEventEnd(e.target.value)} />
                </div>
              </div>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleAddEvent} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CalendarPlus size={15} className="mr-2" />}
                Hinzufügen
              </Button>
            </div>

            {(() => {
              const now = new Date();
              const upcomingEvents = events.filter(e => new Date(e.event_end_date || e.event_date) >= now);
              const pastEvents = events.filter(e => new Date(e.event_end_date || e.event_date) < now).reverse();

              const EventRow = ({ e }: { e: any }) => (
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm" style={{ color: 'var(--app-text)' }}>{e.title}</p>
                      {e.org && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--app-surface2)', color: 'var(--app-text2)', border: '1px solid var(--app-border)' }}>
                          {ORG_LABEL[(e.org as Org) ?? 'jamaat']}
                        </span>
                      )}
                    </div>
                    {e.location && (
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--app-text3)' }}>
                        <MapPin size={10} /> {e.location}
                      </p>
                    )}
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text3)' }}>
                      {new Date(e.event_date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteEvent(e.id)} className="shrink-0 mt-0.5 transition-colors hover:opacity-80" style={{ color: 'var(--app-text3)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              );

              return (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--app-text3)' }}>Kommend ({upcomingEvents.length})</p>
                  {upcomingEvents.length === 0 ? (
                    <p className="text-sm italic text-center p-4 rounded-xl" style={{ color: 'var(--app-text3)', background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
                      Keine kommenden Termine.
                    </p>
                  ) : upcomingEvents.map(e => <EventRow key={e.id} e={e} />)}

                  {pastEvents.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowPastEvents(v => !v)}
                        className="flex items-center gap-1.5 text-xs font-bold mt-1 transition-colors hover:opacity-80"
                        style={{ color: 'var(--app-text3)' }}
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
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--app-text3)' }}>Gebetszeiten</p>
              <div className="space-y-2">
                {prayers.map((prayer) => (
                  <div key={prayer.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl"
                    style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                    <span className="font-bold text-sm capitalize w-20" style={{ color: 'var(--app-text)' }}>{prayer.name}</span>
                    <Input
                      type="time"
                      value={prayer.time}
                      onChange={(e) => handleTimeChange(prayer.id, e.target.value)}
                      className="w-28 font-mono text-center h-9"
                    />
                  </div>
                ))}
              </div>
              <button className="btn-gold w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save size={15} className="mr-2" />}
                Speichern
              </button>
            </div>

            {/* Push */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
              <p className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--app-text3)' }}>
                <BellRing size={12} /> Push Nachricht
              </p>
              <Input placeholder="Titel" value={pushTitle} onChange={e => setPushTitle(e.target.value)} />
              <Input placeholder="Text" value={pushMessage} onChange={e => setPushMessage(e.target.value)} />
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSendPush} disabled={sendingPush}>
                {sendingPush ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                Senden
              </Button>
            </div>

            {/* Cron */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
              <p className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--app-text3)' }}>
                <BellRing size={12} /> Cron / Push Diagnose
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCronTest('debug')} disabled={cronTesting} className="text-xs">
                  {cronTesting ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : null}
                  Debug (trocken)
                </Button>
                <Button size="sm" onClick={() => handleCronTest('force')} disabled={cronTesting} className="text-xs bg-orange-500 hover:bg-orange-600 text-white">
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
                        log.startsWith('⚠️') ? 'text-yellow-400' : 'text-slate-400'}`}>
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
              <p className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--app-text3)' }}>
                <Download size={12} /> Export (CSV)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[['rides','Fahrten'],['bookings','Buchungen'],['profiles','Profile'],['mosque_visits','Besuche']].map(([t, l]) => (
                  <Button key={t} variant="outline" size="sm" onClick={() => downloadCsv(t)} className="text-xs justify-start">
                    <Download size={12} className="mr-1.5" /> {l}
                  </Button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
