-- zikr_logs: Zugriffsregeln nachtragen
--
-- Diese Tabelle wird direkt aus dem Browser gelesen UND geschrieben
-- (history/page.tsx, ZikrWidget.tsx), tauchte aber in keiner SQL-Datei des
-- Projekts auf. Damit war nirgends festgehalten, ob Row Level Security
-- ueberhaupt aktiv ist und welche Regeln gelten.
--
-- Zwei Faelle, die beide zum gemeldeten Fehlerbild passen:
--   a) RLS aktiv, keine Regeln  -> jede Abfrage liefert leer, jedes Schreiben
--      wird verworfen. Supabase meldet dabei KEINEN Fehler, sondern null
--      betroffene Zeilen. Genau so sieht "es wird nichts abgespeichert" aus.
--   b) RLS aus -> jeder mit dem anonymen Schluessel (er steckt in jedem
--      Browser-Bundle) kann fremde Zikr-Staende lesen und aendern.
--
-- Vor dem Ausfuehren im Dashboard unter Advisors -> Security pruefen, was
-- tatsaechlich eingestellt ist. Das Skript ist wiederholbar.

alter table public.zikr_logs enable row level security;

-- Jeder sieht und aendert ausschliesslich seine eigenen Zaehler.
-- "to authenticated" ist Pflicht: Ohne diese Angabe gilt eine Regel fuer
-- "public" und damit auch fuer die anonyme Rolle.
drop policy if exists "zikr_logs: eigene lesen" on public.zikr_logs;
create policy "zikr_logs: eigene lesen"
  on public.zikr_logs for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "zikr_logs: eigene anlegen" on public.zikr_logs;
create policy "zikr_logs: eigene anlegen"
  on public.zikr_logs for insert
  to authenticated
  with check (user_id = auth.uid());

-- Ohne diese Regel laesst sich die Zeile anlegen, aber der Zaehler nie
-- hochsetzen - die Seite wirkt dann so, als wuerde sie beim Verlassen alles
-- vergessen.
drop policy if exists "zikr_logs: eigene aendern" on public.zikr_logs;
create policy "zikr_logs: eigene aendern"
  on public.zikr_logs for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Ein Eintrag pro Person und Tag. Die Seite legt bei fehlender Zeile eine an;
-- ohne diese Bedingung koennen bei zwei gleichzeitig geoeffneten Geraeten
-- doppelte Zeilen entstehen, von denen dann nur eine gepflegt wird.
create unique index if not exists zikr_logs_user_date_unique
  on public.zikr_logs (user_id, log_date);
