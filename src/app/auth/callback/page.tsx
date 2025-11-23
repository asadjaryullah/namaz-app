// src/app/auth/callback/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

function parseHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
  };
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);

      // 1) Versuche Hash-Tokens (#access_token=…)
      const { access_token, refresh_token } = parseHash(url.hash || '');

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (!error) {
          router.replace('/select-prayer');
          return;
        }
      }

      // 2) Fallback: OAuth-/PKCE-Fluss mit ?code=
      const code = url.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace('/select-prayer');
          return;
        }
      }

      // 3) Wenn nichts klappt -> Login
      router.replace('/login');
    })();
  }, [router]);

  return (
    <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#000',color:'#fff'}}>
      <p>Wird angemeldet…</p>
    </main>
  );
}