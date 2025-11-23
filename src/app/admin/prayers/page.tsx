'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type Times = {
  fajr: string;
  zuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

export default function AdminPrayers() {
  const [times, setTimes] = useState<Times | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // hole bestehende Zeiten
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('prayer_times').select('*').limit(1).single();
      if (error) setError(error.message);
      else setTimes(data);
    })();
  }, []);

  async function save() {
    if (!times) return;
    setSaving(true); setMsg(null); setError(null);
    const { error } = await supabase.from('prayer_times')
      .update(times)
      .eq('id', 1); // erste Zeile
    setSaving(false);
    if (error) setError(error.message);
    else setMsg('Zeiten aktualisiert ✅');
  }

  if (!times) return <main><p>Lade...</p></main>;

  return (
    <main>
      <h1>Gebetszeiten bearbeiten</h1>
      <div className="card">
        {Object.entries(times).map(([key, val]) => (
          <div key={key} style={{marginBottom:'1rem'}}>
            <label style={{display:'block', marginBottom:4, fontWeight:600}}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            <input
              type="time"
              value={val}
              onChange={(e)=>setTimes({...times,[key]:e.target.value})}
            />
          </div>
        ))}
        <button onClick={save} disabled={saving}>
          {saving ? 'Speichere...' : 'Speichern'}
        </button>
        {msg && <p style={{color:'green', marginTop:10}}>{msg}</p>}
        {error && <p style={{color:'red', marginTop:10}}>{error}</p>}
      </div>
    </main>
  );
}