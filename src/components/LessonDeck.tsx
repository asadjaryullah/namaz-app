'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, HelpCircle, Layers } from 'lucide-react';
import {
  type LessonCard, CARD_KIND_LABEL, CARD_KIND_ACCENT,
  loadLessonProgress, saveLessonProgress, type LessonProgress,
} from '@/lib/lessons';

/* Kartenstapel fuer Khutba und Dars. Das Umdrehen, Wischen und Abhaken ist
   dem Namaz-Lernen nachgebaut, damit sich beides gleich anfuehlt. Bewusst
   eigenstaendig statt aus learn/page.tsx herausgeloest: Dort haengt die Karte
   an Woertern mit Umschrift, hier an Karten mit Vorder- und Rueckseite in
   zwei Sprachen - ein gemeinsames Bauteil wuerde beide verkomplizieren. */

type Mode = 'learn' | 'quiz';

export default function LessonDeck({ cards }: { cards: LessonCard[] }) {
  const [mode, setMode] = useState<Mode>('learn');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState<LessonProgress>({});
  const [celebrating, setCelebrating] = useState(false);

  const swipeStartX = useRef(0);
  const swipeStartTime = useRef(0);

  /* Lernstand erst nach dem Einhaengen lesen, nicht als Startwert: Der Server
     kennt localStorage nicht, ein Startwert wuerde also beim Hydrieren vom
     Server-HTML abweichen. Gleiches Muster wie beim Namaz-Lernen. */
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setProgress(loadLessonProgress()); }, []);

  const questionCards = useMemo(() => cards.filter(c => c.kind === 'question'), [cards]);
  const deck = mode === 'quiz' ? questionCards : cards;

  /* Beim Moduswechsel auf die erste Karte springen - waehrend des Renderns
     statt in einem Effekt, damit kein Zwischenbild mit falschem Index
     entsteht. Das ist das von React empfohlene Muster fuer "Zustand an eine
     Prop-/Zustandsaenderung anpassen". */
  const [prevMode, setPrevMode] = useState<Mode>(mode);
  if (mode !== prevMode) {
    setPrevMode(mode);
    setIndex(0);
    setRevealed(false);
  }

  const card = deck[index] ?? deck[0];

  const learnedCount = cards.filter(c => c.id && progress[c.id]).length;

  const persist = (p: LessonProgress) => { setProgress(p); saveLessonProgress(p); };

  const markLearned = () => {
    if (!card?.id) return;
    const updated = { ...progress, [card.id]: true };
    persist(updated);
    const allDone = cards.every(c => c.id && updated[c.id]);
    if (allDone && !celebrating) {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 900);
    }
  };

  const unmark = () => {
    if (!card?.id) return;
    const updated = { ...progress };
    delete updated[card.id];
    persist(updated);
  };

  const go = (dir: 1 | -1) => {
    const next = index + dir;
    if (next < 0 || next >= deck.length) return;
    setIndex(next); setRevealed(false);
  };

  const handleSwipe = (e: React.PointerEvent) => {
    const dx = e.clientX - swipeStartX.current;
    const dt = Date.now() - swipeStartTime.current;
    const velocity = Math.abs(dx) / dt;
    if (Math.abs(dx) < 12 && dt < 300) setRevealed(v => !v);
    else if (dx < 0 && (dx < -40 || velocity > 0.3)) go(1);
    else if (dx > 0 && (dx > 40 || velocity > 0.3)) go(-1);
  };

  if (!card) {
    return (
      <p className="text-sm text-center p-6" style={{ color: 'var(--app-text3)' }}>
        {mode === 'quiz' ? 'Zu dieser Lektion gibt es keine Fragen.' : 'Noch keine Karten.'}
      </p>
    );
  }

  const accent = CARD_KIND_ACCENT[card.kind];
  const isArabicFront = (card.kind === 'verse' || card.kind === 'hadith') && !!card.front_ar;
  const isLearned = !!(card.id && progress[card.id]);

  return (
    <div className="space-y-4">
      {/* Modus + Fortschritt */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {([
            { id: 'learn' as Mode, Icon: Layers, label: 'Karten' },
            { id: 'quiz' as Mode, Icon: HelpCircle, label: `Fragen${questionCards.length ? ` (${questionCards.length})` : ''}` },
          ]).map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              disabled={id === 'quiz' && questionCards.length === 0}
              className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40 active:scale-[0.97]"
              style={{
                background: mode === id ? 'var(--app-text)' : 'var(--app-surface2)',
                color: mode === id ? 'var(--app-bg)' : 'var(--app-text2)',
                border: `1px solid ${mode === id ? 'transparent' : 'var(--app-border)'}`,
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--app-text3)' }}>
          {learnedCount}/{cards.length} gelernt
        </span>
      </div>

      {/* Punkte */}
      <div className="flex justify-center flex-wrap gap-1.5">
        {deck.map((c, i) => (
          <button
            key={c.id ?? i}
            onClick={() => { setIndex(i); setRevealed(false); }}
            aria-label={`Karte ${i + 1}`}
            className="rounded-full transition"
            style={{
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              width: i === index ? 20 : 8, height: 8,
              background: c.id && progress[c.id] ? 'var(--app-emerald)' : i === index ? 'var(--app-gold)' : 'var(--app-border)',
            }}
          />
        ))}
      </div>

      {/* Karte */}
      <div
        className={`rounded-3xl overflow-hidden shadow-lg select-none ${celebrating ? 'animate-section-celebrate' : ''}`}
        style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', touchAction: 'pan-y', userSelect: 'none' }}
        onPointerDown={e => { swipeStartX.current = e.clientX; swipeStartTime.current = Date.now(); }}
        onPointerUp={handleSwipe}
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ background: 'var(--app-surface2)', color: accent, border: `1px solid ${accent}` }}>
            {CARD_KIND_LABEL[card.kind]}
          </span>
          <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--app-text3)' }}>
            {index + 1}/{deck.length}
          </span>
        </div>

        <div style={{ perspective: '900px' }}>
          <div style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
            transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
            display: 'grid',
          }}>
            {/* Vorderseite */}
            <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', gridArea: '1/1' }}>
              <div className="px-5 pb-5 pt-2 text-center min-h-[200px] flex flex-col justify-center gap-3">
                {isArabicFront ? (
                  <>
                    <p style={{ fontFamily: 'var(--font-amiri)', fontSize: '1.9rem', direction: 'rtl', color: 'var(--app-text)', lineHeight: 1.9 }}>
                      {card.front_ar}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--app-text2)' }}>{card.front_de}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-extrabold leading-snug" style={{ color: 'var(--app-text)' }}>{card.front_de}</p>
                    {card.front_ur && (
                      <p className="text-xl leading-loose font-urdu" style={{ direction: 'rtl', color: 'var(--app-text2)' }}>
                        {card.front_ur}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="py-3 text-center text-xs font-bold" style={{ color: accent, borderTop: '1px solid var(--app-border)' }}>
                Tippen zum Umdrehen · Wischen zum Blättern
              </div>
            </div>

            {/* Rueckseite */}
            <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', gridArea: '1/1' }}>
              <div className="px-5 py-5 space-y-3">
                <div className="p-3 rounded-2xl" style={{ background: 'var(--app-surface2)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>Deutsch</p>
                  <p className="text-[15px] leading-relaxed font-semibold" style={{ color: 'var(--app-text)' }}>{card.back_de}</p>
                </div>
                {card.back_ur && (
                  <div className="p-3 rounded-2xl" style={{ background: 'var(--app-surface2)' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>اردو</p>
                    <p className="text-xl leading-loose text-right font-urdu" style={{ direction: 'rtl', color: 'var(--app-text)' }}>
                      {card.back_ur}
                    </p>
                  </div>
                )}
                {card.source && (
                  <p className="text-xs text-center italic" style={{ color: 'var(--app-text3)' }}>{card.source}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation + Abhaken */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 shrink-0"
          style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
          disabled={index === 0} onClick={() => go(-1)} aria-label="Zurück">
          <ChevronLeft size={20} />
        </Button>

        {mode === 'quiz' ? (
          <>
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold"
              style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
              onClick={() => { unmark(); go(1); }}>
              Nochmal
            </Button>
            <Button className="flex-1 h-12 rounded-xl font-bold"
              style={{ background: 'var(--app-emerald)', color: '#fff' }}
              onClick={() => { markLearned(); go(1); }}>
              <Check size={16} className="mr-1" /> Wusste ich
            </Button>
          </>
        ) : (
          <Button className="flex-1 h-12 rounded-xl font-bold"
            style={isLearned
              ? { background: 'var(--app-emerald)', color: '#fff' }
              : { background: 'var(--app-text)', color: 'var(--app-bg)' }}
            onClick={() => { if (isLearned) unmark(); else { markLearned(); go(1); } }}>
            {isLearned ? <><Check size={16} className="mr-1" /> Verstanden</> : 'Verstanden'}
          </Button>
        )}

        <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 shrink-0"
          style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
          disabled={index >= deck.length - 1} onClick={() => go(1)} aria-label="Weiter">
          <ChevronRight size={20} />
        </Button>
      </div>
    </div>
  );
}
