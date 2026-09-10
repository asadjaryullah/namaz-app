/**
 * Ob die Einfuehrung schon gezeigt wurde - rein lokal auf dem Geraet, wie
 * beim Theme oder dem Zikr-Fortschritt. Keine Datenbank noetig: Es ist
 * voellig unproblematisch, sie auf einem zweiten Geraet noch einmal zu
 * sehen, und eine Tabelle nur fuer dieses eine Bit waere unverhaeltnismaessig.
 *
 * Versioniert, damit eine spaetere inhaltliche Ueberarbeitung der Tour bei
 * Bestandsmitgliedern erneut angezeigt werden kann, ohne den alten Schluessel
 * zu kapern.
 */
const ONBOARDING_KEY = 'onboarding_seen_v1';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    // Privater Modus o.ae.: lieber einmal zu oft zeigen als nie
    return false;
  }
}

export function markOnboardingSeen() {
  try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
}
