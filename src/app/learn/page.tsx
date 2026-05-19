'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, GraduationCap, BookOpen, Trophy, RefreshCw, Settings, Plus, Trash2, X } from 'lucide-react';

interface NamazWord {
  id: string;
  section: string;
  sectionLabel: string;
  wordNum: number;
  arabic: string;
  transliteration: string;
  german: string;
  urdu: string;
}

// ── Default word-by-word data ─────────────────────────────────────────────────
const DEFAULT_WORDS: NamazWord[] = [
  // Thana
  { id: 't1',  section: 'thana', sectionLabel: 'Thana', wordNum: 1,  arabic: 'سُبْحَانَكَ',       transliteration: 'Subhānaka',       german: 'Erhaben bist Du',             urdu: 'پاک ہے تو' },
  { id: 't2',  section: 'thana', sectionLabel: 'Thana', wordNum: 2,  arabic: 'اللَّهُمَّ',         transliteration: 'Allāhumma',        german: 'O Allah',                     urdu: 'اے اللہ' },
  { id: 't3',  section: 'thana', sectionLabel: 'Thana', wordNum: 3,  arabic: 'وَبِحَمْدِكَ',      transliteration: 'wa bihamdika',     german: 'und Dein ist der Lobpreis',   urdu: 'اور تیری تعریف کے ساتھ' },
  { id: 't4',  section: 'thana', sectionLabel: 'Thana', wordNum: 4,  arabic: 'وَتَبَارَكَ',       transliteration: 'wa tabāraka',      german: 'und gesegnet ist',            urdu: 'اور بابرکت ہے' },
  { id: 't5',  section: 'thana', sectionLabel: 'Thana', wordNum: 5,  arabic: 'اسْمُكَ',           transliteration: 'ismuka',           german: 'Dein Name',                   urdu: 'تیرا نام' },
  { id: 't6',  section: 'thana', sectionLabel: 'Thana', wordNum: 6,  arabic: 'وَتَعَالَىٰ',       transliteration: "wa ta'ālā",        german: 'und hoch erhaben ist',        urdu: 'اور بلند ہے' },
  { id: 't7',  section: 'thana', sectionLabel: 'Thana', wordNum: 7,  arabic: 'جَدُّكَ',           transliteration: 'jadduka',          german: 'Deine Majestät',              urdu: 'تیری عظمت' },
  { id: 't8',  section: 'thana', sectionLabel: 'Thana', wordNum: 8,  arabic: 'وَلَا',             transliteration: 'wa lā',            german: 'und kein',                    urdu: 'اور نہیں' },
  { id: 't9',  section: 'thana', sectionLabel: 'Thana', wordNum: 9,  arabic: 'إِلَٰهَ',           transliteration: 'ilāha',            german: 'Gott / Gottheit',             urdu: 'کوئی معبود' },
  { id: 't10', section: 'thana', sectionLabel: 'Thana', wordNum: 10, arabic: 'غَيْرُكَ',          transliteration: 'ghayruka',         german: 'außer Dir',                   urdu: 'سوائے تیرے' },

  // Al-Fatiha
  { id: 'f1',  section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 1,  arabic: 'بِسْمِ',           transliteration: 'bismi',            german: 'Im Namen',                    urdu: 'نام سے' },
  { id: 'f2',  section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 2,  arabic: 'اللَّهِ',          transliteration: 'Allāhi',           german: 'Allahs',                      urdu: 'اللہ کے' },
  { id: 'f3',  section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 3,  arabic: 'الرَّحْمَٰنِ',     transliteration: 'ar-Raḥmāni',       german: 'des Allgnädigen',             urdu: 'رحمٰن کے' },
  { id: 'f4',  section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 4,  arabic: 'الرَّحِيمِ',      transliteration: 'ar-Raḥīmi',        german: 'des Allbarmherzigen',         urdu: 'رحیم کے' },
  { id: 'f5',  section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 5,  arabic: 'الْحَمْدُ',       transliteration: 'al-ḥamdu',         german: 'aller Lobpreis',              urdu: 'تمام تعریف' },
  { id: 'f6',  section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 6,  arabic: 'لِلَّهِ',         transliteration: 'lillāhi',          german: 'gebührt Allah',               urdu: 'اللہ کے لیے' },
  { id: 'f7',  section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 7,  arabic: 'رَبِّ',           transliteration: 'rabbi',            german: 'dem Herrn',                   urdu: 'رب' },
  { id: 'f8',  section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 8,  arabic: 'الْعَالَمِينَ',   transliteration: "al-'ālamīna",      german: 'der Welten',                  urdu: 'تمام جہانوں کے' },
  { id: 'f9',  section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 9,  arabic: 'مَالِكِ',         transliteration: 'Māliki',           german: 'dem Herrscher',               urdu: 'مالک' },
  { id: 'f10', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 10, arabic: 'يَوْمِ',          transliteration: 'yawmi',            german: 'des Tages',                   urdu: 'دن کے' },
  { id: 'f11', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 11, arabic: 'الدِّينِ',        transliteration: 'ad-dīni',          german: 'des Gerichts',                urdu: 'جزا کے' },
  { id: 'f12', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 12, arabic: 'إِيَّاكَ',        transliteration: 'iyyāka',           german: 'Dich allein',                 urdu: 'تجھی کو' },
  { id: 'f13', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 13, arabic: 'نَعْبُدُ',        transliteration: "na'budu",          german: 'verehren wir',                urdu: 'ہم عبادت کرتے ہیں' },
  { id: 'f14', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 14, arabic: 'نَسْتَعِينُ',     transliteration: "nasta'īnu",        german: 'erflehen wir Hilfe',          urdu: 'ہم مدد مانگتے ہیں' },
  { id: 'f15', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 15, arabic: 'اهْدِنَا',        transliteration: 'ihdinā',           german: 'leite uns',                   urdu: 'ہمیں ہدایت دے' },
  { id: 'f16', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 16, arabic: 'الصِّرَاطَ',      transliteration: 'aṣ-ṣirāṭa',       german: 'den Weg',                     urdu: 'راستے کی' },
  { id: 'f17', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 17, arabic: 'الْمُسْتَقِيمَ',  transliteration: 'al-mustaqīma',     german: 'den geraden',                 urdu: 'سیدھے' },
  { id: 'f18', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 18, arabic: 'الَّذِينَ',       transliteration: 'alladhīna',        german: 'derer, die',                  urdu: 'ان لوگوں کا' },
  { id: 'f19', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 19, arabic: 'أَنْعَمْتَ',      transliteration: "an'amta",          german: 'Du begnadet hast',            urdu: 'جن پر تو نے انعام کیا' },
  { id: 'f20', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 20, arabic: 'عَلَيْهِمْ',      transliteration: "'alayhim",         german: 'auf ihnen',                   urdu: 'ان پر' },
  { id: 'f21', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 21, arabic: 'الْمَغْضُوبِ',    transliteration: 'al-maghḍūbi',      german: 'die Zorn erregten',           urdu: 'جن پر غضب ہوا' },
  { id: 'f22', section: 'fatiha', sectionLabel: 'Al-Fatiha', wordNum: 22, arabic: 'الضَّالِّينَ',    transliteration: 'aḍ-ḍāllīna',      german: 'die Irregehenden',            urdu: 'گمراہوں کا' },
];

const WORDS_KEY = 'namaz_words_v2';
const PROGRESS_KEY = 'namaz_learn_v2';

type ProgressMap = Record<string, { learned: boolean; correct: number; wrong: number }>;

function loadWords(): NamazWord[] {
  try {
    const saved = localStorage.getItem(WORDS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_WORDS;
  } catch { return DEFAULT_WORDS; }
}

function saveWords(words: NamazWord[]) {
  try { localStorage.setItem(WORDS_KEY, JSON.stringify(words)); } catch {}
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const EMPTY_FORM = { arabic: '', transliteration: '', german: '', urdu: '', section: 'thana', sectionLabel: 'Thana' };

export default function LearnPage() {
  const router = useRouter();
  const [words, setWords] = useState<NamazWord[]>([]);
  const [section, setSection] = useState('thana');
  const [mode, setMode] = useState<'learn' | 'quiz' | 'manage'>('learn');
  const [progress, setProgress] = useState<ProgressMap>({});

  // Learn mode
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Quiz mode
  const [quizWords, setQuizWords] = useState<NamazWord[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizDone, setQuizDone] = useState(false);

  // Manage mode
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const loaded = loadWords();
    setWords(loaded);
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) setProgress(JSON.parse(saved));
    } catch {}
  }, []);

  const sections = [...new Map(words.map(w => [w.section, w.sectionLabel])).entries()];
  const sectionWords = words.filter(w => w.section === section);
  const currentCard = sectionWords[cardIndex] ?? sectionWords[0];

  const saveProgress = (updated: ProgressMap) => {
    setProgress(updated);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated)); } catch {}
  };

  const markLearned = () => {
    if (!currentCard) return;
    const prev = progress[currentCard.id] ?? { learned: false, correct: 0, wrong: 0 };
    saveProgress({ ...progress, [currentCard.id]: { ...prev, learned: true } });
  };

  useEffect(() => { setCardIndex(0); setRevealed(false); }, [section]);

  const buildQuizOptions = useCallback((word: NamazWord) => {
    // pull wrong options from all words if section pool is too small
    const pool = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3);
    const opts = shuffle([word.german, ...pool.map(w => w.german)]);
    setQuizOptions(opts);
  }, [words]);

  const startQuiz = useCallback(() => {
    if (sectionWords.length < 2) return;
    const shuffled = shuffle(sectionWords);
    setQuizWords(shuffled);
    setQuizIndex(0);
    setSelected(null);
    setQuizScore({ correct: 0, total: 0 });
    setQuizDone(false);
    buildQuizOptions(shuffled[0]);
  }, [sectionWords, buildQuizOptions]);

  useEffect(() => {
    if (mode === 'quiz') startQuiz();
  }, [mode, section]);

  const handleAnswer = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    const word = quizWords[quizIndex];
    const isCorrect = option === word.german;
    setQuizScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    const prev = progress[word.id] ?? { learned: false, correct: 0, wrong: 0 };
    saveProgress({ ...progress, [word.id]: {
      learned: isCorrect || prev.learned,
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
    }});
  };

  const nextQuiz = () => {
    if (quizIndex + 1 >= quizWords.length) { setQuizDone(true); return; }
    const next = quizIndex + 1;
    setQuizIndex(next);
    setSelected(null);
    buildQuizOptions(quizWords[next]);
  };

  const handleAddWord = () => {
    if (!form.arabic.trim() || !form.german.trim()) return;
    const newWord: NamazWord = {
      id: `custom_${Date.now()}`,
      section: form.section,
      sectionLabel: form.sectionLabel || form.section,
      wordNum: words.filter(w => w.section === form.section).length + 1,
      arabic: form.arabic.trim(),
      transliteration: form.transliteration.trim(),
      german: form.german.trim(),
      urdu: form.urdu.trim(),
    };
    const updated = [...words, newWord];
    setWords(updated);
    saveWords(updated);
    setForm(EMPTY_FORM);
    setShowAddForm(false);
  };

  const handleDeleteWord = (id: string) => {
    const updated = words.filter(w => w.id !== id);
    setWords(updated);
    saveWords(updated);
  };

  const resetToDefaults = () => {
    setWords(DEFAULT_WORDS);
    saveWords(DEFAULT_WORDS);
  };

  const learnedCount = sectionWords.filter(w => progress[w.id]?.learned).length;
  const currentQuizWord = quizWords[quizIndex];
  const correctAnswer = currentQuizWord?.german ?? '';

  return (
    <main className="min-h-screen flex flex-col p-5 pb-28" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ChevronLeft className="h-6 w-6" style={{ color: 'var(--app-text2)' }} />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: 'var(--app-text)' }}>Namaz Lernen</h1>
            <p className="text-xs" style={{ color: 'var(--app-text3)' }}>Wort für Wort</p>
          </div>
        </div>
        <button
          onClick={() => setMode(mode === 'manage' ? 'learn' : 'manage')}
          className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-[0.93] transition-transform"
          style={{
            background: mode === 'manage' ? 'var(--app-text)' : 'var(--app-surface2)',
            border: '1px solid var(--app-border)',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Settings size={18} style={{ color: mode === 'manage' ? 'var(--app-bg)' : 'var(--app-text2)' }} />
        </button>
      </div>

      {mode !== 'manage' && (
        <>
          {/* Section Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {sections.map(([sec, label]) => {
              const sw = words.filter(w => w.section === sec);
              const learned = sw.filter(w => progress[w.id]?.learned).length;
              return (
                <button
                  key={sec}
                  onClick={() => setSection(sec)}
                  className="rounded-2xl px-4 py-2.5 text-left shrink-0 transition-colors active:scale-[0.96]"
                  style={{
                    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                    background: section === sec ? 'var(--app-text)' : 'var(--app-card)',
                    border: `1px solid ${section === sec ? 'var(--app-text)' : 'var(--app-border)'}`,
                  }}
                >
                  <p className="text-xs font-black uppercase tracking-wide" style={{ color: section === sec ? 'var(--app-bg)' : 'var(--app-text3)' }}>
                    {label}
                  </p>
                  <p className="text-[10px] mt-0.5 font-semibold" style={{ color: section === sec ? 'rgba(255,255,255,0.6)' : 'var(--app-text3)' }}>
                    {learned}/{sw.length} gelernt
                  </p>
                </button>
              );
            })}
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 mb-5 p-1 rounded-2xl" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
            {([
              { id: 'learn' as const, label: 'Lernen', Icon: BookOpen },
              { id: 'quiz' as const, label: 'Quiz', Icon: GraduationCap },
            ]).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors active:scale-[0.96]"
                style={{
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  background: mode === id ? 'var(--app-card)' : 'transparent',
                  color: mode === id ? 'var(--app-text)' : 'var(--app-text3)',
                  boxShadow: mode === id ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                }}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── LEARN MODE ── */}
      {mode === 'learn' && currentCard && (
        <div className="flex flex-col gap-4">
          {/* Progress dots */}
          <div className="flex justify-center flex-wrap gap-1.5">
            {sectionWords.map((w, i) => (
              <button
                key={w.id}
                onClick={() => { setCardIndex(i); setRevealed(false); }}
                className="rounded-full transition-all"
                style={{
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  width: i === cardIndex ? 20 : 8, height: 8,
                  background: progress[w.id]?.learned ? 'var(--app-emerald)' : i === cardIndex ? 'var(--app-gold)' : 'var(--app-border)',
                }}
              />
            ))}
          </div>

          {/* Card */}
          <div className="rounded-3xl overflow-hidden shadow-lg" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                style={{ background: 'var(--app-gold-dim)', color: 'var(--app-gold)' }}>
                {currentCard.sectionLabel} · Wort {currentCard.wordNum}
              </span>
              <span className="text-xs font-bold" style={{ color: 'var(--app-text3)' }}>
                {cardIndex + 1}/{sectionWords.length}
              </span>
            </div>

            {/* Arabic word */}
            <div className="px-5 pb-5 pt-2 text-center" style={{ borderBottom: '1px solid var(--app-border)' }}>
              <p
                className="leading-loose"
                style={{
                  fontFamily: 'var(--font-amiri)',
                  fontSize: '3rem',
                  direction: 'rtl',
                  color: 'var(--app-text)',
                  lineHeight: 1.9,
                }}
              >
                {currentCard.arabic}
              </p>
              {currentCard.transliteration && (
                <p className="text-xs mt-2 italic" style={{ color: 'var(--app-text3)', fontFamily: 'serif', letterSpacing: '0.02em' }}>
                  {currentCard.transliteration}
                </p>
              )}
            </div>

            {/* Reveal */}
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full py-5 text-sm font-bold flex items-center justify-center gap-2 active:opacity-60 transition-opacity"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', color: 'var(--app-gold)' }}
              >
                Übersetzung anzeigen ↓
              </button>
            ) : (
              <div className="px-5 py-5 space-y-3 animate-in fade-in duration-300">
                <div className="p-3 rounded-2xl" style={{ background: 'var(--app-surface2)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>Deutsch</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--app-text)' }}>{currentCard.german}</p>
                </div>
                {currentCard.urdu && (
                  <div className="p-3 rounded-2xl" style={{ background: 'var(--app-surface2)' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>اردو</p>
                    <p className="text-lg leading-loose text-right" style={{ direction: 'rtl', color: 'var(--app-text)', fontFamily: 'var(--font-amiri)' }}>
                      {currentCard.urdu}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav + mark */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 shrink-0"
              style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
              disabled={cardIndex === 0}
              onClick={() => { setCardIndex(i => i - 1); setRevealed(false); }}>
              <ChevronLeft size={20} />
            </Button>
            <Button className="flex-1 h-12 rounded-xl font-bold"
              style={progress[currentCard.id]?.learned
                ? { background: 'var(--app-emerald)', color: '#fff' }
                : { background: 'var(--app-text)', color: 'var(--app-bg)' }}
              onClick={() => {
                markLearned();
                if (cardIndex < sectionWords.length - 1)
                  setTimeout(() => { setCardIndex(i => i + 1); setRevealed(false); }, 300);
              }}>
              <Check size={16} className="mr-1" />
              {progress[currentCard.id]?.learned ? 'Gelernt ✓' : 'Als gelernt markieren'}
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 shrink-0"
              style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
              disabled={cardIndex === sectionWords.length - 1}
              onClick={() => { setCardIndex(i => i + 1); setRevealed(false); }}>
              <ChevronRight size={20} />
            </Button>
          </div>

          {learnedCount > 0 && (
            <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'var(--app-emerald-dim)', border: '1px solid var(--app-emerald)' }}>
              <Trophy size={18} style={{ color: 'var(--app-emerald)', flexShrink: 0 }} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--app-emerald)' }}>{learnedCount}/{sectionWords.length} Wörter gelernt</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--app-emerald)' }}>{Math.round((learnedCount / sectionWords.length) * 100)}%</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(34,211,138,0.2)' }}>
                  <div className="h-full rounded-full duration-300 ease-out" style={{ transition: 'width 0.3s ease-out' }}
                    style={{ width: `${(learnedCount / sectionWords.length) * 100}%`, background: 'var(--app-emerald)' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── QUIZ MODE ── */}
      {mode === 'quiz' && (
        <div className="flex flex-col gap-4">
          {sectionWords.length < 2 ? (
            <p className="text-center py-10 text-sm" style={{ color: 'var(--app-text3)' }}>
              Mindestens 2 Wörter für Quiz benötigt.
            </p>
          ) : quizDone ? (
            <div className="flex flex-col items-center text-center gap-5 py-6 animate-in fade-in zoom-in duration-300">
              <div className="p-5 rounded-full" style={{ background: quizScore.correct === quizScore.total ? 'var(--app-emerald-dim)' : 'var(--app-gold-dim)' }}>
                <Trophy size={48} style={{ color: quizScore.correct === quizScore.total ? 'var(--app-emerald)' : 'var(--app-gold)' }} />
              </div>
              <div>
                <p className="text-3xl font-extrabold" style={{ color: 'var(--app-text)' }}>{quizScore.correct}/{quizScore.total}</p>
                <p className="text-base font-bold mt-1" style={{ color: quizScore.correct === quizScore.total ? 'var(--app-emerald)' : 'var(--app-text2)' }}>
                  {quizScore.correct === quizScore.total ? 'MashAllah! Alles richtig! 🎉' : quizScore.correct >= quizScore.total * 0.7 ? 'Sehr gut!' : 'Weiter üben!'}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button className="flex-1 h-12 rounded-xl" variant="outline"
                  style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }} onClick={() => setMode('learn')}>
                  <BookOpen className="mr-2" size={16} /> Lernen
                </Button>
                <Button className="flex-1 h-12 rounded-xl" style={{ background: 'var(--app-text)', color: 'var(--app-bg)' }} onClick={startQuiz}>
                  <RefreshCw className="mr-2" size={16} /> Nochmal
                </Button>
              </div>
            </div>
          ) : currentQuizWord ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: 'var(--app-text3)' }}>Frage {quizIndex + 1}/{quizWords.length}</p>
                <p className="text-xs font-bold" style={{ color: 'var(--app-emerald)' }}>✓ {quizScore.correct} richtig</p>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--app-surface2)' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${(quizIndex / quizWords.length) * 100}%`, background: 'var(--app-gold)', transition: 'width 0.25s ease-out' }} />
              </div>

              {/* Question: Arabic word → pick German meaning */}
              <div className="rounded-3xl p-6 text-center" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', minHeight: 140 }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--app-text3)' }}>
                  Was bedeutet dieses Wort?
                </p>
                <p className="leading-loose" style={{ fontFamily: 'var(--font-amiri)', fontSize: '2.8rem', direction: 'rtl', color: 'var(--app-text)' }}>
                  {currentQuizWord.arabic}
                </p>
                {currentQuizWord.transliteration && (
                  <p className="text-xs mt-1 italic" style={{ color: 'var(--app-text3)' }}>{currentQuizWord.transliteration}</p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2">
                {quizOptions.map((opt, i) => {
                  const isSelected = selected === opt;
                  const isCorrect = opt === correctAnswer;
                  let bg = 'var(--app-card)', border = 'var(--app-border)', color = 'var(--app-text)';
                  if (selected !== null) {
                    if (isCorrect) { bg = 'var(--app-emerald-dim)'; border = 'var(--app-emerald)'; color = 'var(--app-emerald)'; }
                    else if (isSelected) { bg = 'rgba(240,98,146,0.1)'; border = 'var(--app-rose)'; color = 'var(--app-rose)'; }
                  }
                  return (
                    <button key={i} onClick={() => handleAnswer(opt)} disabled={selected !== null}
                      className="w-full rounded-2xl p-4 text-left transition-colors active:scale-[0.98]"
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: bg, border: `1px solid ${border}`, color }}>
                      <p className="text-sm font-semibold">{opt}</p>
                    </button>
                  );
                })}
              </div>

              {selected !== null && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="rounded-2xl p-4" style={{
                    background: selected === correctAnswer ? 'var(--app-emerald-dim)' : 'rgba(240,98,146,0.1)',
                    border: `1px solid ${selected === correctAnswer ? 'var(--app-emerald)' : 'var(--app-rose)'}`,
                  }}>
                    <p className="text-sm font-bold" style={{ color: selected === correctAnswer ? 'var(--app-emerald)' : 'var(--app-rose)' }}>
                      {selected === correctAnswer ? '✓ Richtig! MashAllah!' : `✗ Die Antwort: ${correctAnswer}`}
                    </p>
                  </div>
                  <Button className="w-full h-12 rounded-xl" style={{ background: 'var(--app-text)', color: 'var(--app-bg)' }} onClick={nextQuiz}>
                    {quizIndex + 1 < quizWords.length ? 'Weiter →' : 'Ergebnis →'}
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── MANAGE MODE ── */}
      {mode === 'manage' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>{words.length} Wörter gespeichert</p>
            <div className="flex gap-2">
              <button
                onClick={resetToDefaults}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold active:opacity-60"
                style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text3)', touchAction: 'manipulation' }}
              >
                Zurücksetzen
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold active:opacity-70"
                style={{ background: 'var(--app-gold)', color: '#fff', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <Plus size={14} /> Wort hinzufügen
              </button>
            </div>
          </div>

          {/* Word list grouped by section */}
          {[...new Map(words.map(w => [w.section, w.sectionLabel])).entries()].map(([sec, label]) => (
            <div key={sec}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--app-text3)' }}>{label}</p>
              <div className="space-y-2">
                {words.filter(w => w.section === sec).map(w => (
                  <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
                    <p className="text-xl font-bold shrink-0" style={{ fontFamily: 'var(--font-amiri)', direction: 'rtl', color: 'var(--app-text)', minWidth: 60, textAlign: 'right' }}>
                      {w.arabic}
                    </p>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--app-text)' }}>{w.german}</p>
                      {w.transliteration && (
                        <p className="text-xs italic truncate" style={{ color: 'var(--app-text3)' }}>{w.transliteration}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteWord(w.id)}
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center active:opacity-60"
                      style={{ background: 'rgba(240,98,146,0.1)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    >
                      <Trash2 size={14} style={{ color: 'var(--app-rose)' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Word Sheet ── */}
      {showAddForm && (
        <div className="fixed inset-0 z-[60] flex items-end animate-in fade-in duration-150" style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowAddForm(false)}>
          <div className="w-full rounded-t-3xl animate-in slide-in-from-bottom-4 duration-300 ease-out"
            style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <h3 className="text-base font-extrabold" style={{ color: 'var(--app-text)' }}>Neues Wort</h3>
              <button onClick={() => setShowAddForm(false)} className="active:opacity-60" style={{ touchAction: 'manipulation' }}>
                <X size={20} style={{ color: 'var(--app-text3)' }} />
              </button>
            </div>

            <div className="px-6 space-y-3 pb-2">
              {/* Section picker */}
              <div className="flex gap-2">
                {[...new Map(words.map(w => [w.section, w.sectionLabel])).entries()].map(([sec, label]) => (
                  <button key={sec}
                    onClick={() => setForm(f => ({ ...f, section: sec, sectionLabel: label }))}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:opacity-70"
                    style={{
                      touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                      background: form.section === sec ? 'var(--app-text)' : 'var(--app-card)',
                      color: form.section === sec ? 'var(--app-bg)' : 'var(--app-text2)',
                      border: `1px solid ${form.section === sec ? 'var(--app-text)' : 'var(--app-border)'}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Arabic input */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>Arabisch *</p>
                <input
                  value={form.arabic}
                  onChange={e => setForm(f => ({ ...f, arabic: e.target.value }))}
                  placeholder="بِسْمِ"
                  className="w-full rounded-xl px-4 py-3 text-xl text-right font-bold outline-none"
                  style={{
                    background: 'var(--app-card)', border: '1px solid var(--app-border)',
                    color: 'var(--app-text)', direction: 'rtl', fontFamily: 'var(--font-amiri)',
                  }}
                />
              </div>

              {/* Transliteration */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>Transliteration</p>
                <input
                  value={form.transliteration}
                  onChange={e => setForm(f => ({ ...f, transliteration: e.target.value }))}
                  placeholder="bismi"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                />
              </div>

              {/* German */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>Deutsch *</p>
                <input
                  value={form.german}
                  onChange={e => setForm(f => ({ ...f, german: e.target.value }))}
                  placeholder="Im Namen"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                />
              </div>

              {/* Urdu */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>اردو</p>
                <input
                  value={form.urdu}
                  onChange={e => setForm(f => ({ ...f, urdu: e.target.value }))}
                  placeholder="نام سے"
                  className="w-full rounded-xl px-4 py-3 text-base text-right outline-none"
                  style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', color: 'var(--app-text)', direction: 'rtl', fontFamily: 'var(--font-amiri)' }}
                />
              </div>

              <button
                onClick={handleAddWord}
                disabled={!form.arabic.trim() || !form.german.trim()}
                className="w-full rounded-2xl py-3.5 text-sm font-extrabold active:opacity-70 transition-opacity"
                style={{
                  background: form.arabic.trim() && form.german.trim() ? 'var(--app-gold)' : 'var(--app-surface1)',
                  color: form.arabic.trim() && form.german.trim() ? '#fff' : 'var(--app-text3)',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                }}
              >
                Wort speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
