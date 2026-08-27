/**
 * Eine einzige Stelle fuer die Frage "ist das der Hauptadmin?".
 *
 * Vorher stand der Vergleich siebenmal im Code, sechsmal mit
 * .toLowerCase().trim() und einmal ohne. Die eine Ausnahme in
 * /api/send-push haette bei abweichender Schreibweise der Adresse
 * still 403 geliefert - die Rundnachricht an alle waere also
 * kommentarlos ausgefallen, ohne dass irgendwo ein Fehler auftaucht.
 *
 * Beide Seiten werden normalisiert, weil E-Mail-Adressen in Supabase
 * und in der Umgebungsvariable unterschiedlich geschrieben sein koennen.
 */

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

function normalize(email: string | null | undefined): string {
  return (email || '').toLowerCase().trim();
}

/** true, wenn die Adresse dem konfigurierten Hauptadmin entspricht. */
export function isMainAdmin(email: string | null | undefined): boolean {
  const admin = normalize(ADMIN_EMAIL);
  // Ohne konfigurierte Adresse ist niemand Admin - fail closed
  if (!admin) return false;
  return normalize(email) === admin;
}

/** true, wenn ueberhaupt eine Admin-Adresse hinterlegt ist. */
export function hasAdminConfigured(): boolean {
  return normalize(ADMIN_EMAIL).length > 0;
}
