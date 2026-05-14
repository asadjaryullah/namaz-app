-- Tabelle für Web Push Subscriptions
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);

-- Index für schnelle User-Abfrage
create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

-- RLS aktivieren
alter table push_subscriptions enable row level security;

-- Benutzer dürfen ihre eigenen Subscriptions lesen/schreiben/löschen
create policy "User manages own subscriptions"
  on push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Service Role hat vollen Zugriff (für den Server/Cron)
-- (Service Role umgeht RLS automatisch)
