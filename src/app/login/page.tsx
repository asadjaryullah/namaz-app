// src/app/login/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  // Schon eingeloggt? gleich weiter:
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace('/select-prayer');
    })();
  }, [router]);

  async function handleSendLink() {
    setErrorMsg(null);
    if (!email) { setErrorMsg('Bitte E-Mail eingeben.'); return; }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setErrorMsg(error.message);
    else setSent(true);
  }

  return (
    <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#000',color:'#fff',padding:16}}>
      <div style={{width:'100%',maxWidth:420}}>
        <h1 style={{marginBottom:12}}>Anmeldung</h1>

        {!sent ? (
          <>
            <input
              type="email"
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #333',background:'#111',color:'#fff'}}
            />
            <button onClick={handleSendLink} style={{marginTop:12,padding:'12px 16px',borderRadius:12}}>
              Magic-Link senden
            </button>
            {errorMsg && <p style={{color:'#ff8a8a',marginTop:8}}>{errorMsg}</p>}
          </>
        ) : (
          <>
            <p>Wir haben dir einen Magic-Link geschickt. Öffne die E-Mail und klicke auf den Link.</p>
            <p style={{opacity:.8}}>Du wirst automatisch zurückgeleitet.</p>
          </>
        )}
      </div>
    </main>
  );
}