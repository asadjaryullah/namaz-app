-- Anonymen Zugriff schliessen, Schreibrechte auf Admins begrenzen
--
-- Grundlage: Export von pg_policies aus der echten Datenbank (09.09.). Das
-- Repository kannte bis hierhin nur einen Teil der tatsaechlichen Regeln -
-- vieles war in der Datenbank schon vorhanden, aber nirgends dokumentiert.
--
-- Zwei unabhaengige Probleme fanden sich dabei:
--
-- 1) Policies ohne "to authenticated" gelten fuer die Postgres-Rolle
--    "public" - dazu gehoert auch "anon", die Rolle hinter dem anonymen
--    Schluessel. Der Schluessel steckt in jedem Browser-Bundle der App und
--    ist damit oeffentlich lesbar. Wo die USING-Bedingung auf auth.uid()
--    prueft, ist das folgenlos (anon hat kein auth.uid(), die Bedingung
--    schlaegt fehl). Wo die Bedingung schlicht "true" ist, kann aber JEDER
--    im Internet ohne jede Anmeldung lesen oder sogar schreiben.
--
-- 2) "for all ... using (true)" auf mosque_events und prayer_times bedeutet:
--    Nicht nur Admins, sondern buchstaeblich jeder (bei prayer_times sogar
--    ohne Login) konnte Gebetszeiten und Termine loeschen oder aendern -
--    obwohl eigene API-Routen mit Admin-Pruefung dafuer existieren. Diese
--    Routen nuetzen nichts, wenn die Tabelle selbst offen ist: Jemand kann
--    die Datenbank auch direkt ueber die REST-Schnittstelle ansprechen und
--    die Pruefung damit vollstaendig umgehen. quick_links und daily_quotes
--    hatten dasselbe Problem, nur schon auf "authenticated" eingeschraenkt -
--    jedes angemeldete Mitglied, nicht nur der Admin, konnte dort schreiben.
--
-- Betroffen und wie ernst:
--
--   profiles           - Name, Telefonnummer, Mitgliedsnummer fuer jeden im
--                         Internet lesbar, ohne Login. Der ernsteste Fund.
--   push_subscriptions - Push-Endpunkte inkl. Schluessel, jedem lesbar ohne
--                         Login - erlaubt Zuordnung Geraet <-> Mitglied.
--   rides              - Live-Standort und Telefonnummer des Fahrers, jedem
--                         lesbar ohne Login.
--   bookings           - Abholorte der Mitfahrer, jedem lesbar ohne Login.
--   ride_requests /
--   driver_maybe       - wer wann eine Mitfahrt sucht/anbietet, jedem lesbar
--                         ohne Login (schon vor Wochen als Vorschlag genannt,
--                         aber nie ausgefuehrt - hier noch einmal enthalten).
--   prayer_commitments - wer sich fuer welches Gebet eingetragen hat, jedem
--                         lesbar ohne Login.
--   mosque_events,
--   prayer_times       - jeder ohne Login konnte Termine und Gebetszeiten
--                         loeschen oder faelschen.
--   quick_links,
--   daily_quotes       - jedes angemeldete Mitglied (nicht nur der Admin)
--                         konnte die Startseiten-Links und den Tagesspruch
--                         aendern oder loeschen.
--
-- Diese Migration macht zwei Dinge, beide ohne die Bedeutung der
-- bestehenden Bedingungen zu aendern - nur wer sie ausfuehren darf:
--   a) "to authenticated" ergaenzen, wo eine Regel lesbare Daten oeffentlich
--      machte, ohne dass die App das je gebraucht haette (jede Seite, die
--      diese Tabellen anzeigt, verlangt ohnehin eine Anmeldung).
--   b) Bei mosque_events, prayer_times, quick_links, daily_quotes: Schreiben
--      auf Hauptadmin bzw. Teiladmin mit passendem Recht begrenzen - genau
--      die Personen, denen die jeweilige Oberflaeche im Adminbereich
--      ueberhaupt angezeigt wird.
--
-- Nicht angefasst, weil bereits korrekt: alle Regeln, die auf auth.uid()
-- pruefen (eigene Buchung, eigenes Profil aendern, eigener Zikr-Zaehler
-- usw.) sowie die beiden admin-E-Mail-Pruefungen auf profiles/mosque_visits.
--
-- Bewusst NICHT enthalten: eine engere Eingrenzung von "wer darf welche
-- Buchung/Fahrt sehen" (z.B. nur eigene Fahrten plus aktive). Das waere
-- eine echte Verhaltensaenderung, keine reine Zugriffs-Schliessung, und
-- liesse sich von hier aus nicht gegen die echte Datenbank testen. Dazu
-- gerne separat, mit Ansage, was danach geprueft werden sollte.

-- ── Hilfsfunktion ────────────────────────────────────────────
-- Vermeidet, die Admin-Adresse ein fuenftes Mal hart im SQL zu wiederholen
-- (sie steht schon in "profiles: Admin darf loeschen" und in
-- "mosque_visits: Admin sieht alles"). Aendert sich die Adresse einmal,
-- reicht kuenftig eine Stelle.
create or replace function public.is_main_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'asad.jaryullah@gmail.com';
$$;

-- ── a) Nur noch fuer Angemeldete lesbar ──────────────────────
-- Ueberall gleiches Muster: exakt dieselbe Bedingung, nur zusaetzlich an
-- "authenticated" gebunden. Kein bestehendes Verhalten fuer angemeldete
-- Nutzer aendert sich dadurch.

drop policy if exists "Jeder darf Profile lesen" on public.profiles;
create policy "Jeder darf Profile lesen" on public.profiles
  for select to authenticated using (true);

drop policy if exists "Jeder darf Abos lesen" on public.push_subscriptions;
create policy "Jeder darf Abos lesen" on public.push_subscriptions
  for select to authenticated using (true);

drop policy if exists "Fahrten sehen" on public.rides;
create policy "Fahrten sehen" on public.rides
  for select to authenticated using (true);

drop policy if exists "Buchungen sehen" on public.bookings;
create policy "Buchungen sehen" on public.bookings
  for select to authenticated using (true);

drop policy if exists "read_requests" on public.ride_requests;
create policy "read_requests" on public.ride_requests
  for select to authenticated using (true);

drop policy if exists "read_maybe" on public.driver_maybe;
create policy "read_maybe" on public.driver_maybe
  for select to authenticated using (true);

drop policy if exists "Public read count" on public.prayer_commitments;
create policy "Public read count" on public.prayer_commitments
  for select to authenticated using (true);

drop policy if exists "Events lesen" on public.mosque_events;
create policy "Events lesen" on public.mosque_events
  for select to authenticated using (true);

drop policy if exists "Zeiten sehen" on public.prayer_times;
create policy "Zeiten sehen" on public.prayer_times
  for select to authenticated using (true);

-- ── b) Schreiben nur fuer Admin bzw. passenden Teiladmin ─────
-- Deckt sich mit der Sichtbarkeit im Adminbereich: Wer die jeweilige
-- Oberflaeche dort nicht sieht, konnte die Tabelle bisher trotzdem direkt
-- beschreiben. Jetzt braucht es dieselbe Berechtigung wie fuer den Knopf.

drop policy if exists "Events bearbeiten" on public.mosque_events;
create policy "Events bearbeiten" on public.mosque_events
  for all to authenticated
  using (
    public.is_main_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_edit_events = true)
  )
  with check (
    public.is_main_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_edit_events = true)
  );

drop policy if exists "Zeiten ändern" on public.prayer_times;
create policy "Zeiten ändern" on public.prayer_times
  for all to authenticated
  using (
    public.is_main_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_edit_times = true)
  )
  with check (
    public.is_main_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_edit_times = true)
  );

drop policy if exists "Authenticated write quick_links" on public.quick_links;
create policy "Admin schreibt quick_links" on public.quick_links
  for all to authenticated
  using (
    public.is_main_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_edit_times = true)
  )
  with check (
    public.is_main_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_edit_times = true)
  );

drop policy if exists "Authenticated write daily_quotes" on public.daily_quotes;
create policy "Admin schreibt daily_quotes" on public.daily_quotes
  for all to authenticated
  using (
    public.is_main_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_edit_times = true)
  )
  with check (
    public.is_main_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_edit_times = true)
  );
