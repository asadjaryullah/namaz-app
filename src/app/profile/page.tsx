'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Phone, Save, Loader2, ArrowLeft, Calendar, BadgeInfo, Lock, MessageSquareWarning, List, LogOut } from "lucide-react";
import { toast } from "sonner";

import LocationSettings from '@/components/LocationSettings';

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
  const [isGenderLocked, setIsGenderLocked] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

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
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: formData.fullName,
        phone: formData.phone,
        gender: formData.gender,
        member_id: formData.memberId
      });
      if (error) throw error;
      toast.success("Profil gespeichert!");
      router.refresh();
      router.push('/');
    } catch (error: any) {
      toast.error("Fehler: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openCalendar = (apiUrl: string) => {
    const host = window.location.host;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const httpsUrl = `https://${host}${apiUrl}`;
    const url = isAndroid
      ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpsUrl)}`
      : `webcal://${host}${apiUrl}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <Loader2 className="animate-spin h-8 w-8" style={{ color: 'var(--app-text2)' }} />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pb-20" style={{ background: 'var(--app-bg)' }}>

      <div className="w-full max-w-sm flex items-center mb-6 mt-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}
          style={{ color: 'var(--app-text2)' }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
        </Button>
      </div>

      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>

        <div className="p-6 pb-2">
          <h2 className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>Profil bearbeiten</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--app-text2)' }}>Hier kannst du deine Daten ändern.</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-4">

            {/* GESCHLECHT */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-bold uppercase ml-1" style={{ color: 'var(--app-text2)' }}>Geschlecht</label>
                {isGenderLocked && (
                  <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--app-text3)' }}>
                    <Lock size={10} /> Festgelegt
                  </span>
                )}
              </div>
              <div className={`grid grid-cols-2 gap-2 ${isGenderLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <div
                  onClick={() => !isGenderLocked && setFormData({...formData, gender: 'male'})}
                  className="rounded-xl border-2 p-3 text-center transition-all flex flex-col items-center gap-1"
                  style={{
                    borderColor: formData.gender === 'male' ? 'var(--app-gold)' : 'var(--app-border)',
                    background: formData.gender === 'male' ? 'var(--app-gold-dim)' : 'var(--app-card)',
                    color: formData.gender === 'male' ? 'var(--app-gold)' : 'var(--app-text2)',
                    cursor: isGenderLocked ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="text-xl">🧔🏻‍♂️</span>
                  <span className="text-sm font-bold">Bruder</span>
                </div>
                <div
                  onClick={() => !isGenderLocked && setFormData({...formData, gender: 'female'})}
                  className="rounded-xl border-2 p-3 text-center transition-all flex flex-col items-center gap-1"
                  style={{
                    borderColor: formData.gender === 'female' ? 'var(--app-rose)' : 'var(--app-border)',
                    background: formData.gender === 'female' ? 'rgba(240,98,146,0.12)' : 'var(--app-card)',
                    color: formData.gender === 'female' ? 'var(--app-rose)' : 'var(--app-text2)',
                    cursor: isGenderLocked ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="text-xl">🧕🏻</span>
                  <span className="text-sm font-bold">Schwester</span>
                </div>
              </div>
            </div>

            {/* ID NUMMER */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase ml-1" style={{ color: 'var(--app-text2)' }}>ID-Nummer</label>
              <div className="relative">
                <BadgeInfo className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--app-text3)' }} />
                <Input value={formData.memberId} onChange={(e) => setFormData({...formData, memberId: e.target.value})} className="pl-9" placeholder="z.B. 12345" />
              </div>
            </div>

            {/* NAME */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase ml-1" style={{ color: 'var(--app-text2)' }}>Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--app-text3)' }} />
                <Input value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="pl-9" placeholder="Dein Name" />
              </div>
            </div>

            {/* HANDY */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase ml-1" style={{ color: 'var(--app-text2)' }}>Handynummer</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4" style={{ color: 'var(--app-text3)' }} />
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="pl-9" type="tel" placeholder="0176..." />
              </div>
            </div>

            <button type="submit" className="btn-gold w-full mt-4" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Speichern
            </button>
          </form>

          {/* EINSTELLUNGEN */}
          <div className="mt-8 pt-6 space-y-6" style={{ borderTop: '1px solid var(--app-border)' }}>

            {/* PUSH */}
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--app-text)' }}>Benachrichtigungen</h3>
              <p className="text-xs" style={{ color: 'var(--app-text2)' }}>Push-Benachrichtigungen werden beim ersten Öffnen der App aktiviert.</p>
            </div>

            {/* GPS */}
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--app-text)' }}>GPS / Standort</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--app-text2)' }}>Wird benötigt, damit Fahrer und Mitfahrer sich finden.</p>
              <LocationSettings />
            </div>

            {/* KALENDER */}
            <div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--app-text)' }}>Kalender</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--app-text2)' }}>Wähle, was du im Handy-Kalender sehen möchtest.</p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', color: '#c2410c' }}
                  onClick={() => openCalendar('/api/calendar-events')}
                >
                  <Calendar size={18} /> Veranstaltungen (Abo)
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}
                  onClick={() => openCalendar('/api/calendar')}
                >
                  <Calendar size={18} /> Gebetszeiten (Abo)
                </button>

                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}
                  onClick={() => router.push('/events')}
                >
                  <List size={18} /> Liste ansehen (Web)
                </button>
              </div>
            </div>

            {/* SUPPORT */}
            <div className="pt-4" style={{ borderTop: '1px dashed var(--app-border)' }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--app-text)' }}>Hilfe & Support</h3>
              <a
                href={`https://wa.me/${ADMIN_WHATSAPP}?text=Salam, ich habe einen Fehler in der App gefunden:`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}
                >
                  <MessageSquareWarning size={18} /> Fehler melden (WhatsApp)
                </button>
              </a>
            </div>

            {/* ABMELDEN */}
            <div className="pt-4" style={{ borderTop: '1px dashed var(--app-border)' }}>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'rgba(240,98,146,0.08)', border: '1px solid rgba(240,98,146,0.25)', color: 'var(--app-rose)' }}
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
              >
                <LogOut size={18} /> Abmelden
              </button>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
