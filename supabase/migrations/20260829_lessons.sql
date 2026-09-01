-- Khutba & Dars als Kartenstapel
--
-- Zwei Tabellen: lessons (eine Khutba oder ein Dars) und lesson_cards (die
-- Karten dazu). Geschrieben wird ausschliesslich ueber die Admin-Routen mit
-- dem Service-Schluessel - der Browser liest nur, und nur Veroeffentlichtes.
-- Das ist bewusst anders als bei quick_links und daily_quotes, wo der Browser
-- direkt schreibt: Dort haengt der Schutz allein an RLS-Regeln, die nirgends
-- dokumentiert sind.

create table if not exists public.lessons (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('khutba', 'dars')),
  delivered_on  date not null,
  title         text not null,
  topic         text,                       -- 1-3 Woerter, fuer die Archivsuche
  verse_ref     text,                       -- z.B. "Sure 2, Vers 154"
  verse_ar      text,
  verse_de      text,
  verse_ur      text,
  summary_de    text,
  summary_ur    text,
  published     boolean not null default false,
  published_at  timestamptz,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.lesson_cards (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  sort_order  integer not null default 0,
  kind        text not null check (kind in ('point', 'verse', 'hadith', 'question', 'action')),
  front_de    text not null,
  front_ur    text,
  front_ar    text,                         -- Arabisch bei Vers und Hadith
  back_de     text not null,
  back_ur     text,
  source      text,                         -- Quelle bei Vers und Hadith
  created_at  timestamptz not null default now()
);

create index if not exists lesson_cards_lesson_idx on public.lesson_cards (lesson_id, sort_order);
create index if not exists lessons_published_idx on public.lessons (published, delivered_on desc);

-- ── Zugriff ────────────────────────────────────────────────
-- Lesen: alle Angemeldeten, aber nur Veroeffentlichtes. "to authenticated"
-- ist Pflicht - ohne die Angabe gilt die Regel auch fuer die anonyme Rolle,
-- deren Schluessel in jedem Browser-Bundle steckt.
-- Schreiben: keine Regel = nur der Service-Schluessel (Admin-Routen).

alter table public.lessons enable row level security;
alter table public.lesson_cards enable row level security;

drop policy if exists "lessons: veroeffentlichte lesen" on public.lessons;
create policy "lessons: veroeffentlichte lesen"
  on public.lessons for select
  to authenticated
  using (published = true);

drop policy if exists "lesson_cards: veroeffentlichte lesen" on public.lesson_cards;
create policy "lesson_cards: veroeffentlichte lesen"
  on public.lesson_cards for select
  to authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_cards.lesson_id and l.published = true
    )
  );
