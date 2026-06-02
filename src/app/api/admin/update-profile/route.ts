import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ADMIN_EMAIL || user.email?.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, updates } = await req.json();
  if (!userId || !updates) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await serviceClient.from('profiles').update(updates).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
