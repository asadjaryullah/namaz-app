-- ride_requests / driver_maybe: anonymen Lesezugriff schliessen
--
-- Beide Tabellen wurden per "for select using (true)" ohne "to authenticated"
-- angelegt. Ohne diese Angabe gilt eine Regel fuer die Postgres-Rolle
-- "public" - und dazu gehoert auch "anon", die Rolle hinter dem anonymen
-- Schluessel. Der Schluessel steckt in jedem Browser-Bundle der App, ist
-- also oeffentlich einsehbar.
--
-- Praktisch heisst das: Ohne Login liesse sich auslesen, wer wann zu
-- welchem Gebet eine Mitfahrt gesucht hat (ride_requests) oder als Fahrer
-- "vielleicht" markiert war (driver_maybe) - ein Bewegungsprofil einzelner
-- Mitglieder ohne jede Anmeldung.
--
-- Alle anderen Tabellen im Projekt setzen "to authenticated" korrekt, das
-- hier sind die beiden Ausreisser. Wiederholbar geschrieben.

drop policy if exists "read_requests" on public.ride_requests;
create policy "read_requests" on public.ride_requests
  for select to authenticated using (true);

drop policy if exists "read_maybe" on public.driver_maybe;
create policy "read_maybe" on public.driver_maybe
  for select to authenticated using (true);
