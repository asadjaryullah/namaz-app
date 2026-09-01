/**
 * Gemeinsame Typen und Helfer fuer Khutba & Dars.
 * Client-sicher: kein Supabase, kein Server-Code.
 */

export type LessonKind = 'khutba' | 'dars';
export type CardKind = 'point' | 'verse' | 'hadith' | 'question' | 'action';

export interface LessonCard {
  id?: string;
  sort_order: number;
  kind: CardKind;
  front_de: string;
  front_ur: string | null;
  front_ar: string | null;   // Arabisch bei Vers und Hadith
  back_de: string;
  back_ur: string | null;
  source: string | null;
}

export interface Lesson {
  id?: string;
  kind: LessonKind;
  delivered_on: string;      // YYYY-MM-DD
  title: string;
  topic: string | null;
  verse_ref: string | null;
  verse_ar: string | null;
  verse_de: string | null;
  verse_ur: string | null;
  summary_de: string | null;
  summary_ur: string | null;
  published: boolean;
  published_at?: string | null;
}

export const LESSON_KIND_LABEL: Record<LessonKind, string> = {
  khutba: 'Khutba',
  dars: 'Dars',
};

export const CARD_KIND_LABEL: Record<CardKind, string> = {
  point: 'Kernpunkt',
  verse: 'Vers',
  hadith: 'Hadith',
  question: 'Frage',
  action: 'Diese Woche',
};

/* Farbe je Kartenart - immer ueber Tokens, damit beide Themes stimmen */
export const CARD_KIND_ACCENT: Record<CardKind, string> = {
  point: 'var(--app-gold)',
  verse: 'var(--app-emerald)',
  hadith: 'var(--app-blue)',
  question: 'var(--app-rose)',
  action: 'var(--app-gold)',
};

export function formatLessonDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── Lernfortschritt ────────────────────────────────────────
   Wie beim Namaz-Lernen zunaechst nur auf dem Geraet. Ein Abgleich ueber die
   Datenbank kann spaeter kommen; der Schluessel ist versioniert, damit ein
   Formatwechsel keine alten Daten falsch liest. */
export const LESSON_PROGRESS_KEY = 'lesson_progress_v1';

export type LessonProgress = Record<string, boolean>;   // cardId -> gelernt

export function loadLessonProgress(): LessonProgress {
  try {
    const raw = localStorage.getItem(LESSON_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLessonProgress(p: LessonProgress) {
  try { localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(p)); } catch {}
}

export function countLearned(progress: LessonProgress, cardIds: string[]): number {
  return cardIds.filter(id => progress[id]).length;
}
