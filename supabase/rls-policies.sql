-- ============================================================
-- RLS Policies für Ride 2 Salah
-- Ausführen im Supabase Dashboard → SQL Editor
-- ============================================================

-- ── profiles ──────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Jeder eingeloggte User kann sein eigenes Profil lesen
CREATE POLICY "profiles: eigenes lesen"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Jeder eingeloggte User kann sein eigenes Profil updaten
CREATE POLICY "profiles: eigenes updaten"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Neues Profil nur für sich selbst anlegen
CREATE POLICY "profiles: eigenes anlegen"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ── rides ──────────────────────────────────────────────────
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten User dürfen aktive Fahrten sehen (für Mitfahrer-Suche)
CREATE POLICY "rides: alle aktiven lesen"
  ON rides FOR SELECT
  TO authenticated
  USING (status = 'active' OR driver_id = auth.uid());

-- Nur der Fahrer kann seine Fahrt anlegen (API prüft Token, service role wird genutzt)
-- Kein Client-seitiges INSERT nötig, daher keine INSERT Policy


-- ── bookings ───────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Mitfahrer kann seine eigenen Buchungen lesen
CREATE POLICY "bookings: eigene lesen"
  ON bookings FOR SELECT
  USING (passenger_id = auth.uid());

-- Fahrer kann Buchungen für seine Fahrten lesen
CREATE POLICY "bookings: als Fahrer lesen"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = bookings.ride_id
        AND rides.driver_id = auth.uid()
    )
  );


-- ── mosque_events ──────────────────────────────────────────
ALTER TABLE mosque_events ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten User dürfen Events lesen
CREATE POLICY "mosque_events: alle lesen"
  ON mosque_events FOR SELECT
  TO authenticated
  USING (true);

-- Schreiben nur via service role (Admin API), kein Client-INSERT


-- ── prayer_times ───────────────────────────────────────────
ALTER TABLE prayer_times ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten User dürfen Gebetszeiten lesen
CREATE POLICY "prayer_times: alle lesen"
  ON prayer_times FOR SELECT
  TO authenticated
  USING (true);

-- Schreiben nur via service role (Admin API)


-- ── mosque_visits ──────────────────────────────────────────
ALTER TABLE mosque_visits ENABLE ROW LEVEL SECURITY;

-- User kann nur seine eigenen Besuche lesen und schreiben
CREATE POLICY "mosque_visits: eigene lesen"
  ON mosque_visits FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "mosque_visits: eigene anlegen"
  ON mosque_visits FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Unique Constraint für upsert (falls noch nicht vorhanden):
-- ALTER TABLE mosque_visits
--   ADD CONSTRAINT mosque_visits_unique
--   UNIQUE (user_id, prayer_name, visit_date);


-- ── push_sent ──────────────────────────────────────────────
ALTER TABLE push_sent ENABLE ROW LEVEL SECURITY;

-- Kein Client-Zugriff – nur service role (Cron-Job)
-- Keine Policies → nobody can access except service role
