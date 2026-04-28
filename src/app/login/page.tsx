'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, User, Phone, BadgeInfo } from "lucide-react";
import OneSignal from 'react-onesignal';
import { waitForOneSignalReady } from '@/lib/onesignal';

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [memberId, setMemberId] = useState('');
  const [gender, setGender] = useState('male');
  const [otp, setOtp] = useState('');

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) alert("Google Login fehlgeschlagen: " + error.message);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !phone || !memberId) {
      setError("Bitte fülle alle Pflichtfelder (*) aus.");
      return;
    }
    setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { data: { full_name: fullName, phone, gender, member_id: memberId } },
      });
      if (error) throw error;
      setStep('verify');
    } catch (err: any) {
      setError(err.message || "Fehler beim Senden.");
    } finally { setLoading(false); }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (error) throw error;
      if (data.user && typeof window !== 'undefined') {
        await waitForOneSignalReady(4000);
        try { OneSignal.login(data.user.id); } catch(e) {}
      }
      router.push('/');
    } catch (err: any) {
      setError("Der Code ist falsch oder abgelaufen.");
    } finally { setLoading(false); }
  };

  const inputBase: React.CSSProperties = {
    width: '100%',
    background: 'var(--app-surface1)',
    border: '1px solid var(--app-border)',
    borderRadius: 12,
    padding: '13px 14px 13px 42px',
    color: 'var(--app-text)',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  const onFocusGold = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--app-gold)';
    e.target.style.boxShadow = '0 0 0 3px var(--app-gold-dim)';
  };
  const onBlurReset = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--app-border)';
    e.target.style.boxShadow = 'none';
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: 'var(--app-text2)', textTransform: 'uppercase',
    letterSpacing: '0.1em', marginBottom: 6,
  };
  const iconStyle: React.CSSProperties = {
    position: 'absolute', left: 14, top: '50%',
    transform: 'translateY(-50%)', color: 'var(--app-text3)',
    display: 'flex', pointerEvents: 'none',
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--app-bg)' }}>

      {/* Glow top */}
      <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, var(--app-gold-glow) 0%, transparent 70%)', pointerEvents: 'none' }} />
      {/* Glow bottom */}
      <div style={{ position: 'absolute', bottom: 40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, var(--app-emerald-dim) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Back */}
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => step === 'verify' ? setStep('input') : router.push('/')}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl hover:opacity-80 transition-opacity"
          style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
          Zurück
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm relative z-10">
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
          {/* Gold strip */}
          <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, var(--app-gold), color-mix(in srgb, var(--app-gold) 40%, transparent))' }} />

          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold" style={{ color: 'var(--app-text)', letterSpacing: '-0.02em' }}>
                {step === 'input' ? 'Willkommen zurück' : 'Code eingeben'}
              </h1>
              <p className="text-sm mt-1.5" style={{ color: 'var(--app-text2)' }}>
                {step === 'input' ? 'Gib deine Daten ein, um loszufahren.' : `Code wurde an ${email} gesendet.`}
              </p>
            </div>

            {step === 'input' && (
              <>
                <button onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-2.5 text-sm font-semibold rounded-2xl py-3.5 mb-5 hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--app-surface1)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z"/>
                    <path fill="#EA4335" d="M12 4.61c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Weiter mit Google
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px" style={{ background: 'var(--app-border)' }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--app-text3)' }}>ODER</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--app-border)' }} />
                </div>

                <form onSubmit={handleSendCode} className="space-y-3">
                  <div>
                    <label style={labelStyle}>Geschlecht *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([['male', '🧔🏻‍♂️ Bruder'], ['female', '🧕🏻 Schwester']] as [string,string][]).map(([v, lbl]) => (
                        <button type="button" key={v} onClick={() => setGender(v)}
                          className="py-3 px-2 rounded-xl font-bold text-sm transition-all"
                          style={{
                            background: gender === v ? (v === 'female' ? 'rgba(240,98,146,0.15)' : 'var(--app-gold-dim)') : 'var(--app-surface1)',
                            border: `1px solid ${gender === v ? (v === 'female' ? 'var(--app-rose)' : 'var(--app-gold)') : 'var(--app-border)'}`,
                            color: gender === v ? (v === 'female' ? 'var(--app-rose)' : 'var(--app-gold)') : 'var(--app-text2)',
                          }}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>ID-Nummer *</label>
                    <div className="relative">
                      <span style={iconStyle}><BadgeInfo size={16} /></span>
                      <input style={inputBase} placeholder="z.B. 12345" value={memberId} onChange={e => setMemberId(e.target.value)} onFocus={onFocusGold} onBlur={onBlurReset} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Name *</label>
                    <div className="relative">
                      <span style={iconStyle}><User size={16} /></span>
                      <input style={inputBase} placeholder="Max Mustermann" value={fullName} onChange={e => setFullName(e.target.value)} onFocus={onFocusGold} onBlur={onBlurReset} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Handy *</label>
                    <div className="relative">
                      <span style={iconStyle}><Phone size={16} /></span>
                      <input type="tel" style={inputBase} placeholder="0176..." value={phone} onChange={e => setPhone(e.target.value)} onFocus={onFocusGold} onBlur={onBlurReset} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <div className="relative">
                      <span style={iconStyle}><Mail size={16} /></span>
                      <input type="email" style={inputBase} placeholder="name@beispiel.de" value={email} onChange={e => setEmail(e.target.value)} onFocus={onFocusGold} onBlur={onBlurReset} />
                    </div>
                  </div>
                  {error && <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(240,98,146,0.12)', border: '1px solid rgba(240,98,146,0.3)', color: 'var(--app-rose)' }}>{error}</div>}
                  <button type="submit" disabled={loading} className="btn-gold w-full mt-2" style={{ opacity: loading ? 0.7 : 1 }}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Code anfordern ✨'}
                  </button>
                </form>
              </>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--app-gold)', boxShadow: '0 0 24px var(--app-gold-glow)' }}>
                  <input type="text" placeholder="— — — — — —" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} autoFocus className="font-mono-app"
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontSize: 36, fontWeight: 500, color: 'var(--app-gold)', padding: '22px 16px', letterSpacing: '0.3em' }} />
                </div>
                <p className="text-[11px] text-center" style={{ color: 'var(--app-text3)' }}>Schau in dein Email-Postfach.</p>
                {error && <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(240,98,146,0.12)', border: '1px solid rgba(240,98,146,0.3)', color: 'var(--app-rose)' }}>{error}</div>}
                <button type="submit" disabled={loading} className="btn-emerald w-full" style={{ opacity: loading ? 0.7 : 1 }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : (
                    <><svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Bestätigen &amp; Einloggen</>
                  )}
                </button>
                <button type="button" onClick={() => setStep('input')} className="w-full text-xs py-2 hover:opacity-70 transition-opacity"
                  style={{ background: 'none', border: 'none', color: 'var(--app-text2)', cursor: 'pointer' }}>
                  Falsche Email? Zurück
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
