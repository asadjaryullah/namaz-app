'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { DESTINATION_ADDRESS } from '../../../config';

export default function DriverSetup() {
  const router = useRouter();
  const [seats, setSeats] = useState(1);
  const [saving, setSaving] = useState(false);
  const prayer = typeof window !== 'undefined' ? localStorage.getItem('prayer') : null;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.replace('/login');
    })();
  }, [router]);

  async function createRide() {
    if (!prayer) return alert('Kein Gebet gewählt.');

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) return alert('Kein Benutzer gefunden.');

    const { data, error } = await supabase
      .from('rides')
      .insert({
        user_id: userId,
        prayer,
        mosque: DESTINATION_ADDRESS,        // ✅ feste Adresse
        seats_total: seats,
        seats_available: seats,
        status: 'open',
      })
      .select('id')
      .single();

    setSaving(false);
    if (error) return alert(error.message);
    if (data) router.replace(`/driver/trip/${data.id}`);
  }

  return (
    <main>
      <h1>Fahrt erstellen</h1>
      <div className="card">
        <p><b>Gebet:</b> {(prayer ?? '').toUpperCase()}</p>

        <label style={{display:'block', marginTop:16}}>Ziel (fix)</label>
        <input
          type="text"
          value={DESTINATION_ADDRESS}
          readOnly
          style={{ background:'#f2f2f2', cursor:'not-allowed' }}
        />

        <label style={{display:'block', marginTop:16}}>Freie Plätze (1 – 4)</label>
        <select
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          style={{width:'100%', padding:'10px', borderRadius:'var(--radius)'}}
        >
          {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        <button onClick={createRide} disabled={saving} style={{marginTop:16}}>
          {saving ? 'Speichere …' : 'Fahrt erstellen'}
        </button>
      </div>
    </main>
  );
}