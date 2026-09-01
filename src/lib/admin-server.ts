/**
 * Server-seitige Admin-Pruefung fuer API-Routen.
 * Bewusst getrennt von src/lib/admin.ts: Diese Datei zieht Supabase mit dem
 * Service-Schluessel herein und darf nie in ein Client-Bundle geraten.
 */
import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isMainAdmin } from './admin';

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Ok = { ok: true; userId: string; email: string | null; supabase: SupabaseClient };
type Fail = { ok: false; res: NextResponse };

/**
 * Hauptadmin oder Teiladmin mit Termin-Recht. Dasselbe Muster wie beim
 * Termin-Import: Wer Termine pflegen darf, darf auch Khutba und Dars pflegen.
 */
export async function requireContentAdmin(req: Request): Promise<Ok | Fail> {
  const supabase = serviceClient();

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { ok: false, res: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, res: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  if (!isMainAdmin(userData.user.email)) {
    const { data: profile } = await supabase
      .from('profiles').select('can_edit_events').eq('id', userData.user.id).maybeSingle();
    if (!profile?.can_edit_events) {
      return { ok: false, res: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
    }
  }

  return { ok: true, userId: userData.user.id, email: userData.user.email ?? null, supabase };
}
