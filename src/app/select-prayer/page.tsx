'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Times = { fajr: string; zuhr: string; asr: string; maghrib: string; isha: string; };

export default function SelectPrayer() {
  const router = useRouter();
  const [times, setTimes] = useState<Times | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('prayer_times').select('*').limit(1).single();
      if (data) setTimes(data);
      setLoading(false);
    })();
  }, []);

  const prayers = [
    { key: 'fajr', label: 'Fajr' },
    { key: 'zuhr', label: 'Zuhr' },
    { key: 'asr', label: 'Asr' },
    { key: 'maghrib', label: 'Maghrib' },
    { key: 'isha', label: 'Isha' },
  ];

  function selectPrayer(k: string) {
    localStorage.setItem('prayer', k);
    router.push('/role');
  }

  if (loading) return <main><h1>Wähle dein Gebet</h1><p>Gebetszeiten werden geladen …</p></main>;
  if (!times) return <main><h1>Wähle dein Gebet</h1><p style={{color:'red'}}>Keine Gebetszeiten gefunden.</p></main>;

  return (
    <main>
      <h1>Wähle dein Gebet</h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        justifyItems: 'center',
        padding: '1rem',
      }}>
        {prayers.map(p => (
          <button
            key={p.key}
            onClick={() => selectPrayer(p.key)}
            style={{ width:'100%', padding:'16px 0', fontSize:'1.1rem', borderRadius: 'var(--radius)' }}
          >
            <span style={{ display: 'block', fontWeight: 700 }}>{p.label}</span>
            <span style={{ display:'block', fontSize:'.9rem', opacity:.9, marginTop:4 }}>
              {(times[p.key as keyof Times] || '').slice(0,5)} Uhr
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}