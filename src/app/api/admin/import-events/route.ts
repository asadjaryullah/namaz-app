import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { isMainAdmin } from "@/lib/admin";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Nullable-Felder als anyOf — Structured Outputs unterstützt keine Typ-Arrays
const nullableString = (description: string) => ({
  anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
  description,
});

const EVENT_SCHEMA = {
  type: 'object' as const,
  properties: {
    events: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' as const },
          location: { type: 'string' as const },
          org: {
            type: 'string' as const,
            enum: ['jamaat', 'khuddam', 'atfal', 'ansar', 'lajna', 'nasirat'],
          },
          date: { type: 'string' as const, description: 'Startdatum YYYY-MM-DD' },
          time: nullableString('Startzeit HH:MM oder null bei ganztägig'),
          end_date: nullableString('Enddatum YYYY-MM-DD oder null'),
          end_time: nullableString('Endzeit HH:MM oder null'),
        },
        required: ['title', 'location', 'org', 'date', 'time', 'end_date', 'end_time'],
        additionalProperties: false,
      },
    },
  },
  required: ['events'],
  additionalProperties: false,
};

export async function POST(request: Request) {
  const supabase = getSupabase();

  // Auth: nur Admin oder Teiladmin mit Termin-Rechten
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const isAdminEmail = isMainAdmin(userData.user.email);
  const { data: profile } = await supabase
    .from('profiles')
    .select('can_edit_events')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!isAdminEmail && !profile?.can_edit_events) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY ist nicht konfiguriert. Bitte in Vercel unter Environment Variables setzen.' },
      { status: 500 }
    );
  }

  const { media_type, data, text } = await request.json();

  // Content-Block je nach Dateityp bauen
  let fileBlock: Anthropic.ContentBlockParam;
  if (text) {
    fileBlock = { type: 'text', text: `Dokument-Inhalt:\n\n${text}` };
  } else if (media_type === 'application/pdf') {
    fileBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  } else if (
    media_type === 'image/jpeg' ||
    media_type === 'image/png' ||
    media_type === 'image/gif' ||
    media_type === 'image/webp'
  ) {
    fileBlock = { type: 'image', source: { type: 'base64', media_type, data } };
  } else {
    return NextResponse.json(
      { error: 'Nicht unterstützter Dateityp. Erlaubt: PDF, Bild (JPG/PNG/GIF/WebP), Text.' },
      { status: 400 }
    );
  }

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

  const anthropic = new Anthropic();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: {
        // Extraktion ist mechanisch — mittlerer Effort hält Latenz unter dem 60s-Limit
        effort: 'medium',
        format: { type: 'json_schema', schema: EVENT_SCHEMA },
      },
      system:
        `Du extrahierst Termine aus Dokumenten einer Ahmadiyya-Moscheegemeinde (Bashier Moschee, Bensheim) für einen Kalender. ` +
        `Heute ist ${today}. Fehlt eine Jahresangabe, nimm das nächstliegende zukünftige Datum. ` +
        `Fehlt der Ort, verwende "Bashier Moschee". ` +
        `org-Zuordnung: Khuddam = junge Männer, Atfal = Jungen, Ansar = ältere Männer, Lajna = Frauen, Nasirat = Mädchen, sonst jamaat. ` +
        `Extrahiere NUR echte Termine mit Datum. Überschriften, Fußnoten und Kontaktdaten sind keine Termine.`,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            { type: 'text', text: 'Extrahiere alle Termine aus diesem Dokument.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'Dokument konnte nicht verarbeitet werden.' }, { status: 422 });
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Keine Termine erkannt.' }, { status: 422 });
    }

    const parsed = JSON.parse(textBlock.text);
    return NextResponse.json({ events: parsed.events ?? [] });
  } catch (err: any) {
    console.error('import-events error:', err?.message);
    return NextResponse.json(
      { error: 'Analyse fehlgeschlagen: ' + (err?.message || 'Unbekannter Fehler') },
      { status: 500 }
    );
  }
}
