'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Loader2, Plus, Sparkles, Trash2, ChevronUp, ChevronDown, ArrowLeft, Send, Save, Eye, EyeOff,
} from 'lucide-react';
import {
  type Lesson, type LessonCard, type LessonKind, type CardKind,
  LESSON_KIND_LABEL, CARD_KIND_LABEL, formatLessonDate,
} from '@/lib/lessons';

/* Admin-Tab "Khutba & Dars": Liste, Editor mit KI-Entwurf, Veroeffentlichen.
   Alle Schreibzugriffe laufen ueber /api/admin/lessons - nie direkt aus dem
   Browser in die Tabelle. */

type ListRow = {
  id: string; kind: LessonKind; delivered_on: string; title: string; topic: string | null;
  published: boolean; published_at: string | null; card_count: number;
};

const CARD_KINDS: CardKind[] = ['point', 'verse', 'hadith', 'question', 'action'];

const emptyLesson = (): Lesson => ({
  kind: 'khutba',
  delivered_on: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }),
  title: '', topic: null,
  verse_ref: null, verse_ar: null, verse_de: null, verse_ur: null,
  summary_de: null, summary_ur: null,
  published: false,
});

const emptyCard = (order: number): LessonCard => ({
  sort_order: order, kind: 'point',
  front_de: '', front_ur: null, front_ar: null, back_de: '', back_ur: null, source: null,
});

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

const fieldStyle = {
  background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text)',
} as const;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>{children}</p>;
}

function Area({ value, onChange, placeholder, rtl, rows = 2 }: {
  value: string | null; onChange: (v: string) => void; placeholder?: string; rtl?: boolean; rows?: number;
}) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full rounded-xl px-3 py-2 text-sm outline-none resize-y ${rtl ? 'font-urdu text-right leading-loose' : ''}`}
      style={{ ...fieldStyle, direction: rtl ? 'rtl' : 'ltr' }}
    />
  );
}

export default function LessonsAdmin() {
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit'>('list');

  // Editor
  const [lesson, setLesson] = useState<Lesson>(emptyLesson());
  const [cards, setCards] = useState<LessonCard[]>([]);
  const [textDe, setTextDe] = useState('');
  const [textUr, setTextUr] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/lessons', { headers: await authHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(json.error || 'Liste konnte nicht geladen werden'); setLoading(false); return; }
    setRows(json.lessons ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const startNew = () => {
    setLesson(emptyLesson()); setCards([]); setTextDe(''); setTextUr('');
    setView('edit');
  };

  const openExisting = async (id: string) => {
    const res = await fetch(`/api/admin/lessons?id=${id}`, { headers: await authHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(json.error || 'Konnte nicht geladen werden'); return; }
    setLesson(json.lesson); setCards(json.cards ?? []); setTextDe(''); setTextUr('');
    setView('edit');
  };

  const generate = async () => {
    if (textDe.trim().length < 200) { toast.error('Bitte den ganzen deutschen Text einfügen.'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/lessons/generate', {
        method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({ kind: lesson.kind, delivered_on: lesson.delivered_on, text_de: textDe, text_ur: textUr }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error || 'Entwurf fehlgeschlagen'); return; }
      const d = json.draft;
      setLesson(prev => ({
        ...prev,
        title: d.title || prev.title,
        topic: d.topic ?? prev.topic,
        verse_ref: d.verse_ref, verse_ar: d.verse_ar, verse_de: d.verse_de, verse_ur: d.verse_ur,
        summary_de: d.summary_de, summary_ur: d.summary_ur,
      }));
      setCards(d.cards ?? []);
      toast.success(`${(d.cards ?? []).length} Karten vorgeschlagen — bitte prüfen.`);
    } finally { setGenerating(false); }
  };

  const save = async (publish: boolean) => {
    if (!lesson.title.trim()) { toast.error('Titel fehlt.'); return; }
    if (publish && cards.length === 0) { toast.error('Ohne Karten lässt sich nichts veröffentlichen.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/lessons', {
        method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({ lesson, cards, publish }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error || 'Speichern fehlgeschlagen'); return; }
      if (publish && json.pushed !== undefined && lesson.published === false) {
        toast.success(`Veröffentlicht — Push an ${json.pushed} Geräte.`);
      } else {
        toast.success(publish ? 'Aktualisiert.' : 'Entwurf gespeichert.');
      }
      setLesson(prev => ({ ...prev, id: json.id, published: json.published ?? prev.published }));
      await loadList();
      setView('list');
    } finally { setSaving(false); }
  };

  const remove = async (id: string, title: string) => {
    toast(`„${title}" löschen?`, {
      action: {
        label: 'Löschen',
        onClick: async () => {
          const res = await fetch(`/api/admin/lessons?id=${id}`, { method: 'DELETE', headers: await authHeaders() });
          if (!res.ok) { toast.error('Löschen fehlgeschlagen'); return; }
          toast.success('Gelöscht.');
          loadList();
        },
      },
      cancel: { label: 'Abbrechen', onClick: () => {} },
    });
  };

  const updateCard = (i: number, patch: Partial<LessonCard>) =>
    setCards(cs => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const moveCard = (i: number, dir: -1 | 1) =>
    setCards(cs => {
      const j = i + dir; if (j < 0 || j >= cs.length) return cs;
      const copy = [...cs]; [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy.map((c, k) => ({ ...c, sort_order: k }));
    });
  const removeCard = (i: number) => setCards(cs => cs.filter((_, j) => j !== i).map((c, k) => ({ ...c, sort_order: k })));

  /* ── LISTE ── */
  if (view === 'list') {
    return (
      <div className="space-y-3 animate-in fade-in duration-200">
        <Button onClick={startNew} className="w-full h-11 rounded-xl font-bold" style={{ background: 'var(--app-text)', color: 'var(--app-bg)' }}>
          <Plus size={16} className="mr-1.5" /> Neue Khutba / neues Dars
        </Button>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" style={{ color: 'var(--app-text3)' }} /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-center p-5 rounded-2xl border border-dashed" style={{ color: 'var(--app-text3)', borderColor: 'var(--app-border)' }}>
            Noch nichts angelegt.
          </p>
        ) : rows.map(r => (
          <div key={r.id} className="app-card p-3.5 flex items-center gap-3">
            <button onClick={() => openExisting(r.id)} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--app-gold)' }}>{LESSON_KIND_LABEL[r.kind]}</span>
                <span className="text-[11px]" style={{ color: 'var(--app-text3)' }}>{formatLessonDate(r.delivered_on)}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  style={r.published
                    ? { background: 'var(--app-emerald-dim)', color: 'var(--app-emerald)' }
                    : { background: 'var(--app-surface2)', color: 'var(--app-text3)', border: '1px solid var(--app-border)' }}>
                  {r.published ? <Eye size={10} /> : <EyeOff size={10} />} {r.published ? 'Live' : 'Entwurf'}
                </span>
              </div>
              <p className="font-bold text-sm truncate" style={{ color: 'var(--app-text)' }}>{r.title}</p>
              <p className="text-xs" style={{ color: 'var(--app-text2)' }}>{r.topic ? `${r.topic} · ` : ''}{r.card_count} Karten</p>
            </button>
            <button onClick={() => remove(r.id, r.title)} aria-label="Löschen"
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl"
              style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-rose)' }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    );
  }

  /* ── EDITOR ── */
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--app-text2)' }}>
        <ArrowLeft size={15} /> Zur Liste
      </button>

      {/* Grunddaten */}
      <div className="app-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Art</Label>
            <div className="flex gap-1.5">
              {(['khutba', 'dars'] as LessonKind[]).map(k => (
                <button key={k} onClick={() => setLesson(l => ({ ...l, kind: k }))}
                  className="flex-1 h-10 rounded-xl text-sm font-bold transition"
                  style={{
                    background: lesson.kind === k ? 'var(--app-text)' : 'var(--app-surface2)',
                    color: lesson.kind === k ? 'var(--app-bg)' : 'var(--app-text2)',
                    border: `1px solid ${lesson.kind === k ? 'transparent' : 'var(--app-border)'}`,
                  }}>
                  {LESSON_KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Datum</Label>
            <Input type="date" value={lesson.delivered_on} onChange={e => setLesson(l => ({ ...l, delivered_on: e.target.value }))} className="h-10 rounded-xl" style={fieldStyle} />
          </div>
        </div>
        <div>
          <Label>Titel</Label>
          <Input value={lesson.title} onChange={e => setLesson(l => ({ ...l, title: e.target.value }))} placeholder="Wird vom Entwurf vorgeschlagen" className="h-10 rounded-xl" style={fieldStyle} />
        </div>
        <div>
          <Label>Thema (1–3 Wörter)</Label>
          <Input value={lesson.topic ?? ''} onChange={e => setLesson(l => ({ ...l, topic: e.target.value || null }))} placeholder="z. B. Geduld" className="h-10 rounded-xl" style={fieldStyle} />
        </div>
      </div>

      {/* Text -> KI-Entwurf */}
      {!lesson.id && (
        <div className="app-card p-4 space-y-3">
          <p className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>Text einfügen</p>
          <div>
            <Label>Deutsch</Label>
            <Area value={textDe} onChange={setTextDe} rows={6} placeholder="Die ganze Ansprache auf Deutsch" />
          </div>
          <div>
            <Label>Urdu (optional — sonst wird übersetzt)</Label>
            <Area value={textUr} onChange={setTextUr} rows={4} rtl placeholder="اردو متن" />
          </div>
          <Button onClick={generate} disabled={generating} className="w-full h-11 rounded-xl font-bold" style={{ background: 'var(--app-gold)', color: '#fff' }}>
            {generating ? <Loader2 size={16} className="animate-spin mr-1.5" /> : <Sparkles size={16} className="mr-1.5" />}
            {generating ? 'Karten werden erstellt…' : 'Karten erstellen'}
          </Button>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--app-text3)' }}>
            Der Entwurf hält sich an den Text und erfindet keine Verse oder Ahadith. Trotzdem: alles prüfen, bevor es live geht.
          </p>
        </div>
      )}

      {/* Vers & Zusammenfassung */}
      <div className="app-card p-4 space-y-3">
        <p className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>Zentraler Vers</p>
        <div><Label>Fundstelle</Label><Input value={lesson.verse_ref ?? ''} onChange={e => setLesson(l => ({ ...l, verse_ref: e.target.value || null }))} placeholder="Sure 2, Vers 154" className="h-10 rounded-xl" style={fieldStyle} /></div>
        <div><Label>Arabisch</Label><Area value={lesson.verse_ar} onChange={v => setLesson(l => ({ ...l, verse_ar: v || null }))} rtl /></div>
        <div><Label>Deutsch</Label><Area value={lesson.verse_de} onChange={v => setLesson(l => ({ ...l, verse_de: v || null }))} /></div>
        <div><Label>Urdu</Label><Area value={lesson.verse_ur} onChange={v => setLesson(l => ({ ...l, verse_ur: v || null }))} rtl /></div>
        <p className="text-sm font-bold pt-1" style={{ color: 'var(--app-text)' }}>Zusammenfassung</p>
        <div><Label>Deutsch</Label><Area value={lesson.summary_de} onChange={v => setLesson(l => ({ ...l, summary_de: v || null }))} rows={3} /></div>
        <div><Label>Urdu</Label><Area value={lesson.summary_ur} onChange={v => setLesson(l => ({ ...l, summary_ur: v || null }))} rows={3} rtl /></div>
      </div>

      {/* Karten */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>Karten ({cards.length})</p>
          <button onClick={() => setCards(cs => [...cs, emptyCard(cs.length)])} className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--app-gold)' }}>
            <Plus size={13} /> Karte
          </button>
        </div>

        {cards.map((c, i) => (
          <div key={c.id ?? i} className="app-card p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <select value={c.kind} onChange={e => updateCard(i, { kind: e.target.value as CardKind })}
                className="h-9 rounded-xl px-2 text-xs font-bold flex-1" style={fieldStyle}>
                {CARD_KINDS.map(k => <option key={k} value={k}>{CARD_KIND_LABEL[k]}</option>)}
              </select>
              <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--app-text3)' }}>{i + 1}</span>
              <button onClick={() => moveCard(i, -1)} disabled={i === 0} className="h-9 w-9 rounded-xl disabled:opacity-30" style={fieldStyle} aria-label="Nach oben"><ChevronUp size={15} className="mx-auto" /></button>
              <button onClick={() => moveCard(i, 1)} disabled={i === cards.length - 1} className="h-9 w-9 rounded-xl disabled:opacity-30" style={fieldStyle} aria-label="Nach unten"><ChevronDown size={15} className="mx-auto" /></button>
              <button onClick={() => removeCard(i)} className="h-9 w-9 rounded-xl" style={{ ...fieldStyle, color: 'var(--app-rose)' }} aria-label="Karte löschen"><Trash2 size={15} className="mx-auto" /></button>
            </div>

            {(c.kind === 'verse' || c.kind === 'hadith') && (
              <div><Label>Arabisch (Vorderseite)</Label><Area value={c.front_ar} onChange={v => updateCard(i, { front_ar: v || null })} rtl /></div>
            )}
            <div><Label>Vorderseite Deutsch</Label><Area value={c.front_de} onChange={v => updateCard(i, { front_de: v })} /></div>
            <div><Label>Vorderseite Urdu</Label><Area value={c.front_ur} onChange={v => updateCard(i, { front_ur: v || null })} rtl /></div>
            <div><Label>Rückseite Deutsch</Label><Area value={c.back_de} onChange={v => updateCard(i, { back_de: v })} rows={3} /></div>
            <div><Label>Rückseite Urdu</Label><Area value={c.back_ur} onChange={v => updateCard(i, { back_ur: v || null })} rows={3} rtl /></div>
            {(c.kind === 'verse' || c.kind === 'hadith') && (
              <div><Label>Quelle</Label><Input value={c.source ?? ''} onChange={e => updateCard(i, { source: e.target.value || null })} placeholder="Sahih Bukhari" className="h-9 rounded-xl" style={fieldStyle} /></div>
            )}
          </div>
        ))}
      </div>

      {/* Aktionen */}
      <div className="flex gap-2 pb-4">
        <Button variant="outline" onClick={() => save(false)} disabled={saving} className="flex-1 h-11 rounded-xl font-bold" style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}>
          <Save size={15} className="mr-1.5" /> Entwurf
        </Button>
        <Button onClick={() => save(true)} disabled={saving} className="flex-1 h-11 rounded-xl font-bold" style={{ background: 'var(--app-emerald)', color: '#fff' }}>
          {saving ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Send size={15} className="mr-1.5" />}
          {lesson.published ? 'Aktualisieren' : 'Veröffentlichen'}
        </Button>
      </div>
      {!lesson.published && (
        <p className="text-[11px] text-center -mt-2 pb-2" style={{ color: 'var(--app-text3)' }}>
          Veröffentlichen schickt eine Push an alle.
        </p>
      )}
    </div>
  );
}
