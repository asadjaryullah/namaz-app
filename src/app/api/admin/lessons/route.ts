import { NextResponse } from 'next/server';
import { requireContentAdmin } from '@/lib/admin-server';
import { sendPushToAll } from '@/lib/webpush';
import { formatLessonDate } from '@/lib/lessons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LESSON_KINDS = new Set(['khutba', 'dars']);
const CARD_KINDS = new Set(['point', 'verse', 'hadith', 'question', 'action']);

const str = (v: unknown, max = 4000): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

/* GET  ?id=<uuid>  -> eine Lektion samt Karten (auch unveroeffentlicht)
   GET             -> alle Lektionen mit Kartenanzahl, neueste zuerst */
export async function GET(req: Request) {
  const auth = await requireContentAdmin(req);
  if (!auth.ok) return auth.res;
  const { supabase } = auth;

  const id = new URL(req.url).searchParams.get('id');

  if (id) {
    const [{ data: lesson, error: e1 }, { data: cards, error: e2 }] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', id).maybeSingle(),
      supabase.from('lesson_cards').select('*').eq('lesson_id', id).order('sort_order'),
    ]);
    if (e1 || e2) return NextResponse.json({ error: (e1 || e2)!.message }, { status: 500 });
    if (!lesson) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ lesson, cards: cards ?? [] });
  }

  const { data, error } = await supabase
    .from('lessons')
    .select('id,kind,delivered_on,title,topic,published,published_at,updated_at,lesson_cards(count)')
    .order('delivered_on', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type ListRow = Record<string, unknown> & { lesson_cards?: { count: number }[] };
  const lessons = ((data ?? []) as ListRow[]).map(({ lesson_cards, ...l }) => ({
    ...l,
    card_count: lesson_cards?.[0]?.count ?? 0,
  }));
  return NextResponse.json({ lessons });
}

/* POST { lesson, cards, publish }
   Legt an oder aktualisiert. Karten werden komplett ersetzt - einfacher und
   sicherer als einzelne Diffs, bei hoechstens zehn Karten kein Nachteil.
   Wird zum ersten Mal veroeffentlicht, geht eine Push an alle. */
export async function POST(req: Request) {
  const auth = await requireContentAdmin(req);
  if (!auth.ok) return auth.res;
  const { supabase, userId } = auth;

  const body = await req.json().catch(() => null);
  const l = body?.lesson;
  const rawCards: Array<Record<string, unknown>> = Array.isArray(body?.cards) ? body.cards : [];
  const publish = body?.publish === true;

  if (!l || !LESSON_KINDS.has(l.kind)) return NextResponse.json({ error: 'kind fehlt' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(l.delivered_on || ''))) {
    return NextResponse.json({ error: 'delivered_on muss YYYY-MM-DD sein' }, { status: 400 });
  }
  const title = str(l.title, 120);
  if (!title) return NextResponse.json({ error: 'Titel fehlt' }, { status: 400 });

  const cards = rawCards
    .filter(c => CARD_KINDS.has(String(c?.kind)) && str(c?.front_de) && str(c?.back_de))
    .map((c, i) => ({
      sort_order: i,
      kind: String(c.kind),
      front_de: str(c.front_de)!,
      front_ur: str(c.front_ur),
      front_ar: str(c.front_ar),
      back_de: str(c.back_de)!,
      back_ur: str(c.back_ur),
      source: str(c.source, 200),
    }));

  if (publish && cards.length === 0) {
    return NextResponse.json({ error: 'Ohne Karten laesst sich nichts veroeffentlichen.' }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    kind: l.kind,
    delivered_on: l.delivered_on,
    title,
    topic: str(l.topic, 80),
    verse_ref: str(l.verse_ref, 120),
    verse_ar: str(l.verse_ar),
    verse_de: str(l.verse_de),
    verse_ur: str(l.verse_ur),
    summary_de: str(l.summary_de),
    summary_ur: str(l.summary_ur),
    updated_at: new Date().toISOString(),
  };

  let lessonId: string = l.id;
  let firstPublish = false;

  if (lessonId) {
    const { data: existing, error: exErr } = await supabase
      .from('lessons').select('id,published').eq('id', lessonId).maybeSingle();
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (publish && !existing.published) {
      firstPublish = true;
      row.published = true;
      row.published_at = new Date().toISOString();
    } else if (!publish) {
      // Entwurf speichern nimmt eine Veroeffentlichung nicht zurueck
    }

    const { error: upErr } = await supabase.from('lessons').update(row).eq('id', lessonId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { error: delErr } = await supabase.from('lesson_cards').delete().eq('lesson_id', lessonId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  } else {
    if (publish) {
      firstPublish = true;
      row.published = true;
      row.published_at = new Date().toISOString();
    } else {
      row.published = false;
    }
    row.created_by = userId;
    const { data: created, error: insErr } = await supabase
      .from('lessons').insert(row).select('id').single();
    if (insErr || !created) return NextResponse.json({ error: insErr?.message || 'insert failed' }, { status: 500 });
    lessonId = created.id;
  }

  if (cards.length > 0) {
    const { error: cardErr } = await supabase
      .from('lesson_cards').insert(cards.map(c => ({ ...c, lesson_id: lessonId })));
    if (cardErr) return NextResponse.json({ error: cardErr.message }, { status: 500 });
  }

  let pushed = 0;
  const logs: string[] = [];
  if (firstPublish) {
    const kindLabel = l.kind === 'dars' ? 'Dars' : 'Khutba';
    pushed = await sendPushToAll({
      title: `📖 ${kindLabel} vom ${formatLessonDate(l.delivered_on)}`,
      body: `${title} — ${cards.length} Karten zum Nachlesen`,
      url: `/lessons/${lessonId}`,
    }, logs);
  }

  return NextResponse.json({ id: lessonId, published: row.published ?? undefined, pushed, logs });
}

/* DELETE ?id=<uuid> - Karten fallen per Cascade mit */
export async function DELETE(req: Request) {
  const auth = await requireContentAdmin(req);
  if (!auth.ok) return auth.res;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });

  const { error } = await auth.supabase.from('lessons').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
