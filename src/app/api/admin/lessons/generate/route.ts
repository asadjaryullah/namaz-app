import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireContentAdmin } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/* Nullable als anyOf: Structured Outputs kennt keine Typ-Arrays wie
   ["string","null"]. Gleiches Muster wie beim Termin-Import. */
const nullable = (description: string) => ({
  anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
  description,
});

const CARD_SCHEMA = {
  type: 'object' as const,
  properties: {
    kind: {
      type: 'string' as const,
      enum: ['point', 'verse', 'hadith', 'question', 'action'],
      description: 'point = Kernaussage, verse = Koranvers, hadith = Hadith, question = Verstaendnisfrage, action = konkrete Umsetzung fuer diese Woche',
    },
    front_de: { type: 'string' as const, description: 'Vorderseite Deutsch. Bei verse/hadith ein kurzer Hinweis wie "Der Vers zur Geduld"; sonst die Aussage oder Frage in einem Satz.' },
    front_ur: nullable('Vorderseite Urdu, gleiche Bedeutung wie front_de.'),
    front_ar: nullable('Nur bei verse/hadith: der arabische Originaltext. Sonst null.'),
    back_de: { type: 'string' as const, description: 'Rueckseite Deutsch: Erklaerung, Uebersetzung oder Antwort. 1-4 Saetze.' },
    back_ur: nullable('Rueckseite Urdu, gleiche Bedeutung wie back_de.'),
    source: nullable('Nur bei verse/hadith und nur wenn im Text genannt, z.B. "Sure 2:154" oder "Sahih Bukhari". Sonst null.'),
  },
  required: ['kind', 'front_de', 'front_ur', 'front_ar', 'back_de', 'back_ur', 'source'],
  additionalProperties: false,
};

const LESSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    title: { type: 'string' as const, description: 'Kurzer Titel, hoechstens 60 Zeichen.' },
    topic: { type: 'string' as const, description: 'Ein bis drei Woerter, z.B. "Geduld" oder "Dankbarkeit".' },
    verse_ref: nullable('Fundstelle des zentralen Verses, z.B. "Sure 2, Vers 154". Null, wenn kein Vers im Text.'),
    verse_ar: nullable('Arabischer Text des zentralen Verses, exakt wie im Text. Null, wenn nicht vorhanden.'),
    verse_de: nullable('Deutsche Uebersetzung des zentralen Verses.'),
    verse_ur: nullable('Urdu-Uebersetzung des zentralen Verses.'),
    summary_de: { type: 'string' as const, description: 'Zusammenfassung in 2-3 Saetzen, Deutsch.' },
    summary_ur: nullable('Zusammenfassung in 2-3 Saetzen, Urdu.'),
    cards: { type: 'array' as const, items: CARD_SCHEMA },
  },
  required: ['title', 'topic', 'verse_ref', 'verse_ar', 'verse_de', 'verse_ur', 'summary_de', 'summary_ur', 'cards'],
  additionalProperties: false,
};

const SYSTEM = `Du bereitest Freitagsansprachen (Khutba) und Hadith-Lektionen (Dars) einer Ahmadiyya-Moscheegemeinde (Bashier Moschee, Bensheim) als Lernkarten auf.

Grundsaetze, in dieser Reihenfolge:
1. Treue zum Text. Erfinde keine Verse, keine Ahadith, keine Zitate und keine Quellenangaben. Nimm ausschliesslich, was im uebergebenen Text steht. Fehlt eine Quelle im Text, bleibt source null.
2. Die Sprache des Redners bewahren. Kernpunkte in den Worten der Ansprache formulieren, nicht neu erfinden. Ehrentitel und Segensformeln wie "Hadhrat Masih Maud (as)", "Huzoor (aba)" oder "(saw)" unveraendert uebernehmen.
3. Urdu auf jeder Karte. Liegt der Text auch auf Urdu vor, daraus zitieren. Sonst selbst in natuerliches, gesprochenes Urdu uebersetzen - keine woertliche Schulbuchuebersetzung.

Karten je Art:
- Khutba: 5 bis 8 Karten. Mindestens 3 "point", je 1 "verse" oder "hadith" pro zitierter Stelle, 1 bis 2 "question", genau 1 "action" als letzte Karte.
- Dars: eine "hadith"-Karte pro Hadith im Text (front_ar = Arabisch, back_de = Uebersetzung plus ein Satz Erlaeuterung), danach 1 bis 2 "question" und genau 1 "action".

Die "action"-Karte ist eine konkrete, kleine Umsetzung fuer die kommende Woche, die sich aus dem Text ergibt - kein allgemeiner Rat.
Vorderseiten kurz: ein Satz. Rueckseiten 1 bis 4 Saetze. Keine Aufzaehlungen mit Bindestrichen, ganze Saetze.`;

export async function POST(req: Request) {
  const auth = await requireContentAdmin(req);
  if (!auth.ok) return auth.res;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY ist nicht konfiguriert. Bitte in Vercel unter Environment Variables setzen.' },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const kind = body?.kind === 'dars' ? 'dars' : 'khutba';
  const textDe = String(body?.text_de || '').trim();
  const textUr = String(body?.text_ur || '').trim();
  const deliveredOn = String(body?.delivered_on || '').trim();

  if (textDe.length < 200) {
    return NextResponse.json({ error: 'Der deutsche Text ist zu kurz - bitte die ganze Ansprache einfuegen.' }, { status: 400 });
  }
  if (textDe.length > 60000) {
    return NextResponse.json({ error: 'Der Text ist zu lang (max. 60.000 Zeichen).' }, { status: 400 });
  }

  const anthropic = new Anthropic();
  const kindLabel = kind === 'dars' ? 'Hadith-Dars' : 'Khutba';

  const userText =
    `Art: ${kindLabel}${deliveredOn ? `, gehalten am ${deliveredOn}` : ''}.\n\n` +
    `=== DEUTSCHER TEXT ===\n${textDe}\n\n` +
    (textUr ? `=== URDU-TEXT ===\n${textUr}\n\n` : `(Kein Urdu-Text vorhanden - bitte selbst uebersetzen.)\n\n`) +
    `Erstelle daraus Titel, Thema, zentralen Vers, Zusammenfassung und die Lernkarten.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 12000,
      output_config: {
        /* Hier wird zusammengefasst und uebersetzt, nicht nur extrahiert -
           trotzdem "medium", weil die Route unter dem 60s-Limit bleiben muss. */
        effort: 'medium',
        format: { type: 'json_schema', schema: LESSON_SCHEMA },
      },
      system: SYSTEM,
      messages: [{ role: 'user', content: userText }],
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'Der Text konnte nicht verarbeitet werden.' }, { status: 422 });
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Keine Karten erkannt.' }, { status: 422 });
    }

    const parsed = JSON.parse(textBlock.text);
    const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
    return NextResponse.json({
      draft: {
        ...parsed,
        cards: cards.map((c: Record<string, unknown>, i: number) => ({ ...c, sort_order: i })),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    console.error('lessons/generate:', message);
    return NextResponse.json(
      { error: 'Karten konnten nicht erstellt werden: ' + message },
      { status: 500 }
    );
  }
}
