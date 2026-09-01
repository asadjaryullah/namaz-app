'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTransitionRouter } from 'next-view-transitions';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import LessonDeck from '@/components/LessonDeck';
import { type Lesson, type LessonCard, LESSON_KIND_LABEL, formatLessonDate } from '@/lib/lessons';

export default function LessonPage() {
  const router = useTransitionRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [lesson, setLesson] = useState<(Lesson & { id: string }) | null>(null);
  const [cards, setCards] = useState<LessonCard[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: l, error: e1 }, { data: c, error: e2 }] = await Promise.all([
        supabase.from('lessons').select('*').eq('id', id).maybeSingle(),
        supabase.from('lesson_cards').select('*').eq('lesson_id', id).order('sort_order'),
      ]);
      if (e1 || e2) console.error('lesson laden:', (e1 || e2)!.message);
      if (!l) { setState('missing'); return; }
      setLesson(l as Lesson & { id: string });
      setCards((c as LessonCard[]) ?? []);
      setState('ready');
    };
    load();
  }, [id, router]);

  return (
    <main className="min-h-screen flex flex-col items-center pb-24" style={{ background: 'var(--app-bg)' }}>
      <div className="w-full px-4 py-3 flex items-center gap-3 sticky top-0 z-10"
        style={{ background: 'var(--app-surface1)', borderBottom: '1px solid var(--app-border)' }}>
        <button onClick={() => router.push('/lessons')} aria-label="Zurück"
          className="h-9 w-9 flex items-center justify-center rounded-xl active:scale-[0.95] transition"
          style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}>
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-bold truncate" style={{ color: 'var(--app-text)' }}>
          {lesson ? `${LESSON_KIND_LABEL[lesson.kind]} · ${formatLessonDate(lesson.delivered_on)}` : 'Khutba & Dars'}
        </h1>
      </div>

      <div className="w-full max-w-md p-4 space-y-4">
        {state === 'loading' && (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" style={{ color: 'var(--app-text3)' }} /></div>
        )}

        {state === 'missing' && (
          <p className="text-sm text-center p-6 rounded-2xl border border-dashed"
            style={{ color: 'var(--app-text3)', borderColor: 'var(--app-border)' }}>
            Diese Lektion gibt es nicht oder sie ist noch nicht veröffentlicht.
          </p>
        )}

        {state === 'ready' && lesson && (
          <>
            {/* Kopf: Titel, Thema, zentraler Vers */}
            <div className="app-card p-4 space-y-3 stagger-1">
              <div>
                {lesson.topic && (
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-gold)' }}>{lesson.topic}</p>
                )}
                <h2 className="text-xl font-extrabold leading-snug" style={{ color: 'var(--app-text)' }}>{lesson.title}</h2>
              </div>
              {lesson.verse_ar && (
                <div className="p-3 rounded-2xl text-center space-y-2" style={{ background: 'var(--app-surface2)' }}>
                  <p style={{ fontFamily: 'var(--font-amiri)', fontSize: '1.5rem', direction: 'rtl', color: 'var(--app-text)', lineHeight: 1.9 }}>
                    {lesson.verse_ar}
                  </p>
                  {lesson.verse_de && <p className="text-sm" style={{ color: 'var(--app-text2)' }}>{lesson.verse_de}</p>}
                  {lesson.verse_ur && (
                    <p className="text-lg leading-loose font-urdu" style={{ direction: 'rtl', color: 'var(--app-text2)' }}>{lesson.verse_ur}</p>
                  )}
                  {lesson.verse_ref && <p className="text-[11px] italic" style={{ color: 'var(--app-text3)' }}>{lesson.verse_ref}</p>}
                </div>
              )}
              {lesson.summary_de && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--app-text2)' }}>{lesson.summary_de}</p>
              )}
            </div>

            <div className="stagger-2">
              <LessonDeck cards={cards} />
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
