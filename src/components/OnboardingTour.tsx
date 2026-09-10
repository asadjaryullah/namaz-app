'use client';

import { useEffect, useRef, useState } from 'react';
import { Car, BookOpen, CalendarDays, ScrollText, GraduationCap, Sparkles, ChevronRight, X, Check } from 'lucide-react';
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/onboarding';

/* Kurze Einfuehrung beim allerersten Start. Die App hat inzwischen fuenf
   eigenstaendige Ecken (Fahrt, Zikr, Termine, Khutba, Lernen) - ohne
   Hinweis findet ein neues Mitglied davon oft nur die Startseite und nie
   den Rest, obwohl alles fertig gebaut ist.

   Bewusst auf der Startseite ausgeloest statt nach complete-profile: Ein
   Bestandsmitglied, das sich auf einem neuen Geraet anmeldet, durchlaeuft
   complete-profile nie erneut, saehe die Tour also nie. Auf der Startseite
   sehen beide Faelle sie einmal.

   Die Symbole je Kachel sind absichtlich dieselben wie in der unteren
   Leiste bzw. auf den jeweiligen Homescreen-Karten (BookOpen fuer Zikr,
   CalendarDays fuer Termine, GraduationCap fuer Lernen) - wer die Tour
   gesehen hat, erkennt das Symbol spaeter wieder. */

type Slide = {
  icon: React.ElementType;
  accent: string;
  accentDim: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: Sparkles, accent: 'var(--app-gold)', accentDim: 'var(--app-gold-dim)',
    title: 'Assalamu Alaikum!',
    body: 'Kurz gezeigt, was Ride 2 Salah alles kann — in ein paar Bildschirmen, dann geht’s los.',
  },
  {
    icon: Car, accent: 'var(--app-emerald)', accentDim: 'var(--app-emerald-dim)',
    title: 'Mitfahren',
    body: 'Auf der Startseite siehst du sofort, wer gerade zum nächsten Gebet fährt — oder bietest selbst Plätze an.',
  },
  {
    icon: BookOpen, accent: 'var(--app-rose)', accentDim: 'rgba(240,98,146,0.12)',
    title: 'Zikr zählen',
    body: 'Tasbih, Istighfar und Dua mit einem Tipp mitzählen. Über den Zikr-Knopf unten geht’s direkt zum Zähler.',
  },
  {
    icon: CalendarDays, accent: 'var(--app-blue)', accentDim: 'var(--app-blue-dim)',
    title: 'Termine',
    body: 'Alle Gemeindetermine an einem Ort, mit Erinnerung vorab — und als Abo für deinen eigenen Kalender.',
  },
  {
    icon: ScrollText, accent: 'var(--app-gold)', accentDim: 'var(--app-gold-dim)',
    title: 'Khutba & Dars',
    body: 'Die Freitagsansprache als Karten zum Nachlesen — auch wenn du mal nicht da warst.',
  },
  {
    icon: GraduationCap, accent: 'var(--app-emerald)', accentDim: 'var(--app-emerald-dim)',
    title: 'Namaz lernen',
    body: 'Die Bedeutung der Gebetsworte üben, mit Karten und einem kurzen Quiz.',
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'back'>('next');

  const swipeStartX = useRef(0);
  const swipeStartTime = useRef(0);

  /* Erst nach dem Einhaengen aus localStorage lesen - der Server kennt
     localStorage nicht, ein Startwert wuerde beim Hydrieren abweichen.
     Gleiches Muster wie beim Lernfortschritt der Khutba-Karten. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasSeenOnboarding()) setVisible(true);
  }, []);

  if (!visible) return null;

  const close = () => { markOnboardingSeen(); setVisible(false); };
  const isLast = index === SLIDES.length - 1;

  const go = (dir: 1 | -1) => {
    const next = index + dir;
    if (next < 0) return;
    if (next >= SLIDES.length) { close(); return; }
    setDirection(dir === 1 ? 'next' : 'back');
    setIndex(next);
  };

  const handleSwipe = (e: React.PointerEvent) => {
    const dx = e.clientX - swipeStartX.current;
    const dt = Date.now() - swipeStartTime.current;
    const velocity = Math.abs(dx) / dt;
    if (dx < 0 && (dx < -40 || velocity > 0.3)) go(1);
    else if (dx > 0 && (dx > 40 || velocity > 0.3)) go(-1);
  };

  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-5 animate-in fade-in duration-200"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-lg animate-in zoom-in-95 fade-in duration-250"
        style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', touchAction: 'pan-y' }}
        onPointerDown={e => { swipeStartX.current = e.clientX; swipeStartTime.current = Date.now(); }}
        onPointerUp={handleSwipe}
      >
        {/* Ueberspringen */}
        <div className="flex justify-end p-3 pb-0">
          <button
            onClick={close}
            aria-label="Einführung überspringen"
            className="h-8 w-8 flex items-center justify-center rounded-full active:scale-[0.9] transition-transform"
            style={{ color: 'var(--app-text3)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Inhalt - key sorgt fuer erneutes Einhaengen und damit die Eintritts-Animation je Wechsel */}
        <div
          key={index}
          className={`px-7 pb-2 pt-2 flex flex-col items-center text-center gap-4 animate-in fade-in duration-300 ${
            direction === 'next' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'
          }`}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center animate-in zoom-in-95 duration-300"
            style={{ background: slide.accentDim, border: `1px solid ${slide.accent}` }}
          >
            <Icon size={30} style={{ color: slide.accent }} />
          </div>
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--app-text)' }}>{slide.title}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--app-text2)' }}>{slide.body}</p>
        </div>

        {/* Punkte */}
        <div className="flex justify-center gap-1.5 pt-5 pb-1">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > index ? 'next' : 'back'); setIndex(i); }}
              aria-label={`Bildschirm ${i + 1}`}
              className="rounded-full transition-all duration-200"
              style={{
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                width: i === index ? 18 : 6, height: 6,
                background: i === index ? slide.accent : 'var(--app-border)',
              }}
            />
          ))}
        </div>

        {/* Weiter / Los geht's */}
        <div className="p-5 pt-3">
          <button
            onClick={() => go(1)}
            className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            style={{ background: 'var(--app-text)', color: 'var(--app-bg)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            {isLast ? <>Los geht’s <Check size={17} /></> : <>Weiter <ChevronRight size={17} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
