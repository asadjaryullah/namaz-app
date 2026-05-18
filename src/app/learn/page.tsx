'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, RotateCcw, GraduationCap, BookOpen, Trophy, RefreshCw } from 'lucide-react';

interface NamazPhrase {
  id: string;
  section: 'thana' | 'fatiha';
  sectionLabel: string;
  phraseNum: number;
  arabic: string;
  transliteration: string;
  german: string;
  urdu: string;
}

const ALL_PHRASES: NamazPhrase[] = [
  { id: 't1', section: 'thana', sectionLabel: 'Thana', phraseNum: 1,
    arabic: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ',
    transliteration: 'Subhānaka Allāhumma wa bihamdika',
    german: 'Erhaben bist Du, o Allah, und Dir gebührt aller Lobpreis',
    urdu: 'پاک ہے تو اے اللہ، اور حمد ہے تجھ کو' },
  { id: 't2', section: 'thana', sectionLabel: 'Thana', phraseNum: 2,
    arabic: 'وَتَبَارَكَ اسْمُكَ وَتَعَالَىٰ جَدُّكَ',
    transliteration: "wa tabāraka-smuka wa ta'ālā jadduka",
    german: 'Gesegnet ist Dein Name und erhaben ist Deine Hoheit',
    urdu: 'مبارک ہے تیرا نام اور بلند ہے تیری شان' },
  { id: 't3', section: 'thana', sectionLabel: 'Thana', phraseNum: 3,
    arabic: 'وَلَا إِلَٰهَ غَيْرُكَ',
    transliteration: 'wa lā ilāha ghayruka',
    german: 'Und es gibt keine Gottheit außer Dir',
    urdu: 'اور کوئی عبادت کے لائق نہیں سوائے تیرے' },
  { id: 'f1', section: 'fatiha', sectionLabel: 'Al-Fatiha', phraseNum: 1,
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    transliteration: 'Bismillāhi r-raḥmāni r-raḥīm',
    german: 'Im Namen Allahs, des Gnädigen, des Barmherzigen',
    urdu: 'اللہ کے نام سے جو بے حد رحم والا، ہمیشہ رحم والا ہے' },
  { id: 'f2', section: 'fatiha', sectionLabel: 'Al-Fatiha', phraseNum: 2,
    arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration: "Al-ḥamdu lillāhi rabbi l-'ālamīn",
    german: 'Aller Lobpreis gebührt Allah, dem Herrn der Welten',
    urdu: 'تمام تعریفیں اللہ کے لیے ہیں جو تمام جہانوں کا رب ہے' },
  { id: 'f3', section: 'fatiha', sectionLabel: 'Al-Fatiha', phraseNum: 3,
    arabic: 'الرَّحْمَٰنِ الرَّحِيمِ',
    transliteration: 'Ar-raḥmāni r-raḥīm',
    german: 'Dem Gnädigen, dem Barmherzigen',
    urdu: 'بے حد رحم کرنے والا، بار بار رحم کرنے والا' },
  { id: 'f4', section: 'fatiha', sectionLabel: 'Al-Fatiha', phraseNum: 4,
    arabic: 'مَالِكِ يَوْمِ الدِّينِ',
    transliteration: 'Māliki yawmi d-dīn',
    german: 'Dem Herrn des Tages des Gerichts',
    urdu: 'روزِ جزا کے مالک' },
  { id: 'f5', section: 'fatiha', sectionLabel: 'Al-Fatiha', phraseNum: 5,
    arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    transliteration: "Iyyāka na'budu wa iyyāka nasta'īn",
    german: 'Dir allein dienen wir und Dich allein bitten wir um Hilfe',
    urdu: 'تیری ہی ہم عبادت کرتے ہیں اور تجھ ہی سے ہم مدد مانگتے ہیں' },
  { id: 'f6', section: 'fatiha', sectionLabel: 'Al-Fatiha', phraseNum: 6,
    arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
    transliteration: 'Iḥdinā ṣ-ṣirāṭa l-mustaqīm',
    german: 'Führe uns den geraden Weg',
    urdu: 'ہمیں سیدھے راستے کی ہدایت دے' },
  { id: 'f7', section: 'fatiha', sectionLabel: 'Al-Fatiha', phraseNum: 7,
    arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
    transliteration: "Ṣirāṭa l-ladhīna an'amta 'alayhim, ghayri l-maghḍūbi 'alayhim wa lā ḍ-ḍāllīn",
    german: 'Den Weg derer, die Du begnadet hast — nicht derer, die Deinen Zorn erregt haben, noch der Irregehenden',
    urdu: 'ان لوگوں کا راستہ جن پر تو نے انعام کیا، نہ ان کا جن پر غضب کیا گیا اور نہ گمراہوں کا' },
];

type ProgressMap = Record<string, { learned: boolean; correct: number; wrong: number }>;
const PROGRESS_KEY = 'namaz_learn_v1';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function LearnPage() {
  const router = useRouter();
  const [section, setSection] = useState<'thana' | 'fatiha'>('thana');
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');
  const [progress, setProgress] = useState<ProgressMap>({});

  // Learn mode
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Quiz mode
  const [quizPhrases, setQuizPhrases] = useState<NamazPhrase[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizDone, setQuizDone] = useState(false);
  const [quizDir] = useState<'de->ar' | 'ar->de'>('de->ar');

  const sectionPhrases = ALL_PHRASES.filter(p => p.section === section);
  const currentCard = sectionPhrases[cardIndex] ?? sectionPhrases[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) setProgress(JSON.parse(saved));
    } catch {}
  }, []);

  const saveProgress = (updated: ProgressMap) => {
    setProgress(updated);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated)); } catch {}
  };

  const markLearned = () => {
    const prev = progress[currentCard.id] ?? { learned: false, correct: 0, wrong: 0 };
    saveProgress({ ...progress, [currentCard.id]: { ...prev, learned: true } });
  };

  useEffect(() => {
    setCardIndex(0);
    setRevealed(false);
  }, [section]);

  const buildQuizOptions = useCallback((phrase: NamazPhrase, dir: 'de->ar' | 'ar->de') => {
    const pool = shuffle(ALL_PHRASES.filter(p => p.id !== phrase.id)).slice(0, 3);
    const correct = dir === 'de->ar' ? phrase.arabic : phrase.german;
    const wrongs = pool.map(p => dir === 'de->ar' ? p.arabic : p.german);
    setQuizOptions(shuffle([correct, ...wrongs]));
  }, []);

  const startQuiz = useCallback(() => {
    const shuffled = shuffle(sectionPhrases);
    setQuizPhrases(shuffled);
    setQuizIndex(0);
    setSelected(null);
    setQuizScore({ correct: 0, total: 0 });
    setQuizDone(false);
    buildQuizOptions(shuffled[0], quizDir);
  }, [section, quizDir, buildQuizOptions]);

  useEffect(() => {
    if (mode === 'quiz') startQuiz();
  }, [mode, section]);

  const handleAnswer = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    const phrase = quizPhrases[quizIndex];
    const correct = quizDir === 'de->ar' ? phrase.arabic : phrase.german;
    const isCorrect = option === correct;
    setQuizScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    const prev = progress[phrase.id] ?? { learned: false, correct: 0, wrong: 0 };
    saveProgress({
      ...progress,
      [phrase.id]: {
        learned: isCorrect || prev.learned,
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1),
      },
    });
  };

  const nextQuiz = () => {
    if (quizIndex + 1 >= quizPhrases.length) { setQuizDone(true); return; }
    const nextIdx = quizIndex + 1;
    setQuizIndex(nextIdx);
    setSelected(null);
    buildQuizOptions(quizPhrases[nextIdx], quizDir);
  };

  const learnedCount = sectionPhrases.filter(p => progress[p.id]?.learned).length;
  const currentPhrase = quizPhrases[quizIndex];
  const correctAnswer = currentPhrase ? (quizDir === 'de->ar' ? currentPhrase.arabic : currentPhrase.german) : '';

  return (
    <main className="min-h-screen flex flex-col p-5 pb-28" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ChevronLeft className="h-6 w-6" style={{ color: 'var(--app-text2)' }} />
        </Button>
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--app-text)' }}>Namaz Lernen</h1>
          <p className="text-xs" style={{ color: 'var(--app-text3)' }}>Wort für Wort verstehen</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['thana', 'fatiha'] as const).map(s => {
          const phrases = ALL_PHRASES.filter(p => p.section === s);
          const learned = phrases.filter(p => progress[p.id]?.learned).length;
          return (
            <button
              key={s}
              onClick={() => setSection(s)}
              className="rounded-2xl p-3 text-left transition-all active:opacity-70"
              style={{
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                background: section === s ? 'var(--app-text)' : 'var(--app-card)',
                border: `1px solid ${section === s ? 'var(--app-text)' : 'var(--app-border)'}`,
              }}
            >
              <p className="text-xs font-black uppercase tracking-wide" style={{ color: section === s ? 'var(--app-bg)' : 'var(--app-text3)' }}>
                {s === 'thana' ? 'Thana' : 'Al-Fatiha'}
              </p>
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: section === s ? 'rgba(255,255,255,0.6)' : 'var(--app-text3)' }}>
                {learned}/{phrases.length} gelernt
              </p>
            </button>
          );
        })}
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-5 p-1 rounded-2xl" style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
        {([
          { id: 'learn', label: 'Lernen', Icon: BookOpen },
          { id: 'quiz', label: 'Quiz', Icon: GraduationCap },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:opacity-70"
            style={{
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              background: mode === id ? 'var(--app-card)' : 'transparent',
              color: mode === id ? 'var(--app-text)' : 'var(--app-text3)',
              boxShadow: mode === id ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── LEARN MODE ── */}
      {mode === 'learn' && (
        <div className="flex flex-col gap-4">
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5">
            {sectionPhrases.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setCardIndex(i); setRevealed(false); }}
                className="rounded-full transition-all"
                style={{
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  width: i === cardIndex ? 20 : 8,
                  height: 8,
                  background: progress[p.id]?.learned
                    ? 'var(--app-emerald)'
                    : i === cardIndex
                      ? 'var(--app-gold)'
                      : 'var(--app-border)',
                }}
              />
            ))}
          </div>

          {/* Card */}
          <div className="rounded-3xl overflow-hidden shadow-lg" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}>
            {/* Section badge + phrase number */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                style={{ background: 'var(--app-gold-dim)', color: 'var(--app-gold)' }}>
                {currentCard.sectionLabel}
              </span>
              <span className="text-xs font-bold" style={{ color: 'var(--app-text3)' }}>
                {cardIndex + 1} / {sectionPhrases.length}
              </span>
            </div>

            {/* Arabic text */}
            <div className="px-5 pb-5 pt-2 text-center" style={{ borderBottom: '1px solid var(--app-border)' }}>
              <p
                className="leading-loose"
                style={{
                  fontFamily: 'var(--font-amiri)',
                  fontSize: currentCard.arabic.length > 60 ? '1.4rem' : currentCard.arabic.length > 40 ? '1.7rem' : '2.2rem',
                  direction: 'rtl',
                  color: 'var(--app-text)',
                  lineHeight: 1.9,
                }}
              >
                {currentCard.arabic}
              </p>
              <p className="text-xs mt-3 italic" style={{ color: 'var(--app-text3)', fontFamily: 'serif', letterSpacing: '0.02em' }}>
                {currentCard.transliteration}
              </p>
            </div>

            {/* Reveal area */}
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full py-5 text-sm font-bold flex items-center justify-center gap-2 active:opacity-60 transition-opacity"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', color: 'var(--app-gold)' }}
              >
                Übersetzung anzeigen ↓
              </button>
            ) : (
              <div className="px-5 py-5 space-y-4 animate-in fade-in duration-300">
                <div className="p-3 rounded-2xl" style={{ background: 'var(--app-surface2)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>Deutsch</p>
                  <p className="text-base font-semibold leading-snug" style={{ color: 'var(--app-text)' }}>
                    {currentCard.german}
                  </p>
                </div>
                <div className="p-3 rounded-2xl" style={{ background: 'var(--app-surface2)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--app-text3)' }}>اردو</p>
                  <p className="text-base leading-loose text-right" style={{ direction: 'rtl', color: 'var(--app-text)', fontFamily: 'var(--font-amiri)' }}>
                    {currentCard.urdu}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation + mark */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-12 w-12 shrink-0"
              style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
              disabled={cardIndex === 0}
              onClick={() => { setCardIndex(i => i - 1); setRevealed(false); }}
            >
              <ChevronLeft size={20} />
            </Button>

            <Button
              className="flex-1 h-12 rounded-xl font-bold"
              style={progress[currentCard.id]?.learned
                ? { background: 'var(--app-emerald)', color: '#fff' }
                : { background: 'var(--app-text)', color: 'var(--app-bg)' }
              }
              onClick={() => {
                markLearned();
                if (cardIndex < sectionPhrases.length - 1) {
                  setTimeout(() => { setCardIndex(i => i + 1); setRevealed(false); }, 300);
                }
              }}
            >
              {progress[currentCard.id]?.learned
                ? <><Check size={16} className="mr-1" /> Gelernt</>
                : <><Check size={16} className="mr-1" /> Als gelernt markieren</>
              }
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-12 w-12 shrink-0"
              style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
              disabled={cardIndex === sectionPhrases.length - 1}
              onClick={() => { setCardIndex(i => i + 1); setRevealed(false); }}
            >
              <ChevronRight size={20} />
            </Button>
          </div>

          {/* Section progress */}
          {learnedCount > 0 && (
            <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'var(--app-emerald-dim)', border: '1px solid var(--app-emerald)' }}>
              <Trophy size={18} style={{ color: 'var(--app-emerald)', flexShrink: 0 }} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--app-emerald)' }}>
                    {learnedCount} von {sectionPhrases.length} gelernt
                  </p>
                  <p className="text-xs font-bold" style={{ color: 'var(--app-emerald)' }}>
                    {Math.round((learnedCount / sectionPhrases.length) * 100)}%
                  </p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(34,211,138,0.2)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(learnedCount / sectionPhrases.length) * 100}%`, background: 'var(--app-emerald)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── QUIZ MODE ── */}
      {mode === 'quiz' && (
        <div className="flex flex-col gap-4">
          {quizDone ? (
            /* Result screen */
            <div className="flex flex-col items-center text-center gap-5 py-6 animate-in fade-in zoom-in duration-400">
              <div className="p-5 rounded-full" style={{ background: quizScore.correct === quizScore.total ? 'var(--app-emerald-dim)' : 'var(--app-gold-dim)' }}>
                <Trophy size={48} style={{ color: quizScore.correct === quizScore.total ? 'var(--app-emerald)' : 'var(--app-gold)' }} />
              </div>
              <div>
                <p className="text-3xl font-extrabold" style={{ color: 'var(--app-text)' }}>
                  {quizScore.correct}/{quizScore.total}
                </p>
                <p className="text-base font-bold mt-1" style={{ color: quizScore.correct === quizScore.total ? 'var(--app-emerald)' : 'var(--app-text2)' }}>
                  {quizScore.correct === quizScore.total
                    ? 'MashAllah! Alles richtig! 🎉'
                    : quizScore.correct >= quizScore.total * 0.7
                      ? 'Sehr gut! Weiter üben!'
                      : 'Übe weiter — du schaffst das!'}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button className="flex-1 h-12 rounded-xl" variant="outline"
                  style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
                  onClick={() => setMode('learn')}>
                  <BookOpen className="mr-2" size={16} /> Lernen
                </Button>
                <Button className="flex-1 h-12 rounded-xl" style={{ background: 'var(--app-text)', color: 'var(--app-bg)' }}
                  onClick={startQuiz}>
                  <RefreshCw className="mr-2" size={16} /> Nochmal
                </Button>
              </div>
            </div>
          ) : currentPhrase ? (
            <>
              {/* Score + progress */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: 'var(--app-text3)' }}>
                  Frage {quizIndex + 1}/{quizPhrases.length}
                </p>
                <p className="text-xs font-bold" style={{ color: 'var(--app-emerald)' }}>
                  ✓ {quizScore.correct} richtig
                </p>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--app-surface2)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${((quizIndex) / quizPhrases.length) * 100}%`, background: 'var(--app-gold)' }}
                />
              </div>

              {/* Question card */}
              <div className="rounded-3xl p-5 text-center" style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)', minHeight: 140 }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--app-text3)' }}>
                  {quizDir === 'de->ar' ? 'Welche arabische Phrase bedeutet…' : 'Was bedeutet diese Phrase auf Deutsch?'}
                </p>
                {quizDir === 'de->ar' ? (
                  <p className="text-base font-semibold leading-snug" style={{ color: 'var(--app-text)' }}>
                    „{currentPhrase.german}"
                  </p>
                ) : (
                  <p className="text-2xl leading-loose" style={{ fontFamily: 'var(--font-amiri)', direction: 'rtl', color: 'var(--app-text)' }}>
                    {currentPhrase.arabic}
                  </p>
                )}
              </div>

              {/* Answer options */}
              <div className="space-y-2">
                {quizOptions.map((opt, i) => {
                  const isSelected = selected === opt;
                  const isCorrect = opt === correctAnswer;
                  let bg = 'var(--app-card)';
                  let border = 'var(--app-border)';
                  let color = 'var(--app-text)';
                  if (selected !== null) {
                    if (isCorrect) { bg = 'var(--app-emerald-dim)'; border = 'var(--app-emerald)'; color = 'var(--app-emerald)'; }
                    else if (isSelected) { bg = 'rgba(240,98,146,0.1)'; border = 'var(--app-rose)'; color = 'var(--app-rose)'; }
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={selected !== null}
                      className="w-full rounded-2xl p-4 text-left transition-all active:opacity-70"
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: bg, border: `1px solid ${border}`, color }}
                    >
                      <p
                        className="text-sm font-semibold leading-snug"
                        style={{
                          direction: quizDir === 'de->ar' ? 'rtl' : 'ltr',
                          fontFamily: quizDir === 'de->ar' ? 'var(--font-amiri)' : 'inherit',
                          fontSize: quizDir === 'de->ar' ? '1.1rem' : '0.875rem',
                        }}
                      >
                        {opt}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Feedback + Next */}
              {selected !== null && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="rounded-2xl p-4" style={{
                    background: selected === correctAnswer ? 'var(--app-emerald-dim)' : 'rgba(240,98,146,0.1)',
                    border: `1px solid ${selected === correctAnswer ? 'var(--app-emerald)' : 'var(--app-rose)'}`,
                  }}>
                    <p className="text-sm font-bold" style={{ color: selected === correctAnswer ? 'var(--app-emerald)' : 'var(--app-rose)' }}>
                      {selected === correctAnswer ? '✓ Richtig! MashAllah!' : '✗ Nicht ganz — die richtige Antwort:'}
                    </p>
                    {selected !== correctAnswer && (
                      <p className="text-sm mt-1 font-semibold" style={{
                        color: 'var(--app-text)',
                        direction: quizDir === 'de->ar' ? 'rtl' : 'ltr',
                        fontFamily: quizDir === 'de->ar' ? 'var(--font-amiri)' : 'inherit',
                        fontSize: quizDir === 'de->ar' ? '1rem' : '0.875rem',
                      }}>
                        {correctAnswer}
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full h-12 rounded-xl"
                    style={{ background: 'var(--app-text)', color: 'var(--app-bg)' }}
                    onClick={nextQuiz}
                  >
                    {quizIndex + 1 < quizPhrases.length ? 'Weiter →' : 'Ergebnis anzeigen →'}
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </main>
  );
}
