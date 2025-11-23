'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Role() {
  const router = useRouter();
  const [prayer, setPrayer] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/login');
      setPrayer(localStorage.getItem('prayer'));
    })();
  }, [router]);

  return (
    <main>
      <h1>Rolle wählen</h1>
      <div style={{ textAlign:'center', marginBottom: '2rem', fontSize:'1.1rem' }}>
        Gebet:&nbsp;<b style={{ color:'var(--accent)' }}>{(prayer ?? '—').toUpperCase()}</b>
      </div>

      <div style={{ display:'flex', justifyContent:'center', gap:'1rem', flexWrap:'wrap' }}>
        <button onClick={() => router.push('/driver/setup')} style={{ minWidth:160 }}>Ich bin Fahrer</button>
        <button onClick={() => router.push('/rider')} style={{ minWidth:160 }}>Ich bin Mitfahrer</button>
      </div>
    </main>
  );
}