'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, BookOpen, Loader2, Search } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import {
  type Lesson, LESSON_KIND_LABEL, formatLessonDate,
  loadLessonProgress, type LessonProgress,
} from '@/lib/lessons';

type Row = Lesson & { id: string; lesson_cards: { id: string }[] };

export default function LessonsPage() {
  const router = useTransitionRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [progress, setProgress] = useState<LessonProgress>({});

  useEffect(() => {
    // Lernstand erst nach dem Einhaengen lesen (localStorage gibt es auf dem Server nicht)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadLessonProgress());
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      /* Nur Karten-IDs mitladen - reicht fuer Anzahl und Fortschritt, ohne
         saemtliche Texte des Archivs ueber die Leitung zu schicken. */
      const { data, error } = await supabase
        .from('lessons')
        .select('id,kind,delivered_on,title,topic,summary_de,published,lesson_cards(id)')
        .eq('published', true)
        .order('delivered_on', { ascending: false });
      if (error) console.error('lessons laden:', error.message);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    };
    load();
  }, [router]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.title.toLowerCase().includes(s) ||
      (r.topic ?? '').toLowerCase().includes(s) ||
      (r.summary_de ?? '').toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <main className="min-h-screen flex flex-col items-center pb-24" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full px-4 py-3 flex items-center gap-3 sticky top-0 z-10"
        style={{ background: 'var(--app-surface1)', borderBottom: '1px solid var(--app-border)' }}>
        <button onClick={() => router.push('/')} aria-label="Zurück"
          className="h-9 w-9 flex items-center justify-center rounded-xl active:scale-[0.95] transition"
          style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}>
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-bold" style={{ color: 'var(--app-text)' }}>Khutba & Dars</h1>
      </div>

      <div className="w-full max-w-md p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--app-text3)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Thema oder Titel suchen"
            className="w-full h-11 pl-9 pr-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" style={{ color: 'var(--app-text3)' }} /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-center p-6 rounded-2xl border border-dashed"
            style={{ color: 'var(--app-text3)', borderColor: 'var(--app-border)' }}>
            {rows.length === 0 ? 'Noch keine Khutba veröffentlicht.' : 'Nichts gefunden.'}
          </p>
        ) : filtered.map((r, i) => {
          const ids = r.lesson_cards.map(c => c.id);
          const learned = ids.filter(id => progress[id]).length;
          const done = ids.length > 0 && learned === ids.length;
          return (
            <button
              key={r.id}
              onClick={() => router.push(`/lessons/${r.id}`)}
              className={`w-full text-left app-card p-4 flex gap-3 items-start active:scale-[0.98] transition stagger-${Math.min(i + 1, 6)}`}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: done ? 'var(--app-emerald-dim)' : 'var(--app-gold-dim)', color: done ? 'var(--app-emerald)' : 'var(--app-gold)' }}>
                <BookOpen size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--app-gold)' }}>
                    {LESSON_KIND_LABEL[r.kind]}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--app-text3)' }}>{formatLessonDate(r.delivered_on)}</span>
                </div>
                <p className="font-extrabold text-[15px] leading-snug truncate" style={{ color: 'var(--app-text)' }}>{r.title}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--app-text2)' }}>
                  {r.topic ? `${r.topic} · ` : ''}{ids.length} Karten · {learned} gelernt
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <BottomNav />
    </main>
  );
}
