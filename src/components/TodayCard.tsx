'use client';

import { useEffect, useState } from 'react';
import { Car, User } from 'lucide-react';

type Prayer = { id: string; name: string; time: string };

type Props = {
  allPrayers: Prayer[];
  nextPrayer: Prayer | null;
  selectedPrayer: Prayer | null;
  onSelectPrayer: (p: Prayer) => void;
  loadingPrayerState: boolean;
  isApproved: boolean;

  commitmentCount: number;
  isCommitted: boolean;
  togglingCommit: boolean;
  popCommit: boolean;
  onToggleCommit: () => void;

  rideRequestCount: number;
  myRideRequest: string | null;
  togglingRequest: boolean;
  onToggleRequest: () => void;

  driverMaybeCount: number;
  myDriverMaybe: boolean;
  togglingMaybe: boolean;
  onToggleMaybe: () => void;

  activeDriverRide: any;
  activePassengerRide: any;
  todayRiderCount: number;

  onOfferRide: () => void;
  onOpenDriverRide: () => void;
  onOpenPassengerRide: () => void;
};

const PRAYER_ICONS: Record<string, string> = {
  Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙',
};

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function getBerlinMinutes() {
  const hhmm = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }).slice(11, 16);
  return toMinutes(hhmm);
}

export default function TodayCard(p: Props) {
  const [minsLeft, setMinsLeft] = useState<number | null>(null);
  const shown = p.selectedPrayer ?? p.nextPrayer;

  useEffect(() => {
    if (!shown) { setMinsLeft(null); return; }
    const compute = () => {
      const diff = toMinutes(shown.time) - getBerlinMinutes();
      setMinsLeft(diff > 0 ? diff : diff + 24 * 60);
    };
    compute();
    const t = setInterval(compute, 60_000);
    return () => clearInterval(t);
  }, [shown]);

  if (!shown) {
    return (
      <div className="h-32 w-full rounded-2xl animate-pulse"
        style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }} />
    );
  }

  const isNext = !!p.nextPrayer && shown.id === p.nextPrayer.id;
  const isClose = isNext && minsLeft !== null && minsLeft <= 30;
  const countdown = minsLeft === null
    ? '—'
    : minsLeft >= 60
      ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`
      : `${minsLeft} Min`;
  const icon = PRAYER_ICONS[shown.name] || '🕌';
  const hasActiveRide = !!(p.activeDriverRide || p.activePassengerRide);

  return (
    <div className="w-full rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: isClose ? 'var(--app-emerald-dim)' : 'var(--app-surface2)',
        border: `1px solid ${isClose ? 'var(--app-emerald)' : 'var(--app-border)'}`,
        boxShadow: isClose ? '0 4px 24px rgba(34,211,138,0.15)' : 'none',
        transition: 'background-color 0.3s ease-out, border-color 0.3s ease-out, box-shadow 0.3s ease-out',
      }}>

      <div className="absolute right-4 top-9 text-[68px] opacity-[0.07] select-none pointer-events-none leading-none">
        {icon}
      </div>

      <div className="relative z-10">
        {/* Kopf */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: isClose ? 'var(--app-emerald)' : isNext ? 'var(--app-text2)' : 'var(--app-gold)' }}>
            {isClose ? '🕌 Gleich ist Gebet' : isNext ? 'Nächstes Gebet · heute' : 'Vorausplanen · heute'}
          </p>
          {!isNext && p.nextPrayer && (
            <button
              onClick={() => p.onSelectPrayer(p.nextPrayer!)}
              className="text-[10px] font-bold active:opacity-60"
              style={{ color: 'var(--app-text3)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
              ← {p.nextPrayer.name}
            </button>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-extrabold leading-none"
              style={{ color: 'var(--app-text)', letterSpacing: '-0.03em' }}>
              {shown.name}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--app-text2)' }}>{shown.time} Uhr</p>
          </div>
          <p key={countdown} className="font-mono-app text-4xl font-bold leading-none tabular-nums animate-count-in"
            style={{ color: isClose ? 'var(--app-emerald)' : 'var(--app-gold)', letterSpacing: '-0.02em' }}>
            {countdown}
          </p>
        </div>

        {/* Gebetszeiten — antippbar, um für ein anderes Gebet zu planen */}
        {p.allPrayers.length > 0 && (
          <div className="mt-4 pt-3 flex gap-1" style={{ borderTop: '1px solid var(--app-border)' }}>
            {p.allPrayers.map((pr) => {
              const active = pr.id === shown.id;
              const isTheNext = !!p.nextPrayer && pr.id === p.nextPrayer.id;
              return (
                <button
                  key={pr.id}
                  onClick={() => p.onSelectPrayer(pr)}
                  aria-pressed={active}
                  aria-label={`${pr.name} um ${pr.time} Uhr auswählen`}
                  className="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 rounded-lg relative active:scale-[0.94] transition-transform"
                  style={{
                    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                    background: active ? 'var(--app-gold-dim)' : 'transparent',
                    border: `1px solid ${active ? 'var(--app-gold)' : 'transparent'}`,
                  }}>
                  {isTheNext && !active && (
                    <span className="absolute top-1 right-1 w-1 h-1 rounded-full"
                      style={{ background: 'var(--app-gold)' }} />
                  )}
                  <span className="text-[9px] font-bold uppercase tracking-wide truncate max-w-full px-0.5"
                    style={{ color: active ? 'var(--app-gold)' : 'var(--app-text3)' }}>
                    {pr.name}
                  </span>
                  <span className="font-mono-app text-[11px] font-bold tabular-nums"
                    style={{ color: active ? 'var(--app-gold)' : 'var(--app-text2)' }}>
                    {pr.time}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Aktive Fahrt ersetzt die Aktionen */}
        {p.isApproved && hasActiveRide && isNext && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--app-border)' }}>
            {p.activeDriverRide && (
              <button onClick={p.onOpenDriverRide}
                className="w-full flex items-center justify-between gap-3 rounded-xl p-3 text-left active:scale-[0.98] transition-transform"
                style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 mb-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--app-gold)' }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--app-gold)' }} />
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--app-gold)' }}>Aktive Fahrt · Live</span>
                  </span>
                  <p className="font-extrabold text-base leading-tight" style={{ color: 'var(--app-gold)' }}>Du bist Fahrer</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text2)' }}>Navigation &amp; Mitfahrer ansehen →</p>
                </div>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--app-gold-dim)', border: '1px solid var(--app-gold)' }}>
                  <Car size={20} style={{ color: 'var(--app-gold)' }} />
                </span>
              </button>
            )}

            {p.activePassengerRide && (
              <button onClick={p.onOpenPassengerRide}
                className={`w-full flex items-center justify-between gap-3 rounded-xl p-3 text-left active:scale-[0.98] transition-transform ${p.activeDriverRide ? 'mt-2' : ''}`}
                style={{ background: 'var(--app-emerald-dim)', border: '1px solid var(--app-emerald)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 mb-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--app-emerald)' }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--app-emerald)' }} />
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--app-emerald)' }}>Aktive Fahrt · Live</span>
                  </span>
                  <p className="font-extrabold text-base leading-tight" style={{ color: 'var(--app-emerald)' }}>Du fährst mit</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text2)' }}>Fahrer-Standort &amp; Details →</p>
                </div>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--app-emerald-dim)', border: '1px solid var(--app-emerald)' }}>
                  <User size={20} style={{ color: 'var(--app-emerald)' }} />
                </span>
              </button>
            )}
          </div>
        )}

        {/* Aktionen für das gewählte Gebet */}
        {p.isApproved && !(hasActiveRide && isNext) && (
          <div className="mt-3 pt-3 flex flex-col gap-2"
            style={{ borderTop: '1px solid var(--app-border)', opacity: p.loadingPrayerState ? 0.5 : 1, transition: 'opacity 0.15s' }}>
            {p.rideRequestCount === 0 && p.driverMaybeCount === 0 && !p.myRideRequest && (
              <p className="text-[11px] text-center" style={{ color: 'var(--app-text3)' }}>
                Noch niemand für {shown.name} angemeldet — sei der Erste!
              </p>
            )}

            <button
              onClick={p.onToggleCommit}
              disabled={p.togglingCommit || p.loadingPrayerState}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors active:scale-[0.97] ${p.popCommit ? 'animate-pop' : ''}`}
              style={{
                background: p.isCommitted ? 'var(--app-emerald)' : 'transparent',
                color: p.isCommitted ? '#fff' : 'var(--app-emerald)',
                border: '2px solid var(--app-emerald)',
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              }}>
              {p.togglingCommit
                ? '...'
                : p.isCommitted
                  ? `Ich komme zum ${shown.name} ✓${p.commitmentCount > 0 ? ` · ${p.commitmentCount}` : ''}`
                  : `Ich komme zum ${shown.name}${p.commitmentCount > 0 ? ` · ${p.commitmentCount} zugesagt` : ''}`}
            </button>

            <div className="flex gap-1.5">
              <button
                onClick={p.onToggleRequest}
                disabled={p.togglingRequest || p.loadingPrayerState}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors active:scale-[0.96]"
                style={{
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  background: p.myRideRequest ? 'var(--app-blue-dim)' : 'var(--app-surface1)',
                  border: `1px solid ${p.myRideRequest ? 'var(--app-blue)' : 'var(--app-border)'}`,
                  color: p.myRideRequest ? 'var(--app-blue)' : 'var(--app-text2)',
                }}>
                {p.togglingRequest ? '...' : p.myRideRequest ? '✓ Mitfahren' : 'Mitfahren'}
              </button>

              <button
                onClick={p.onToggleMaybe}
                disabled={p.togglingMaybe || p.loadingPrayerState}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors active:scale-[0.96]"
                style={{
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  background: p.myDriverMaybe ? 'var(--app-gold-dim)' : 'var(--app-surface1)',
                  border: `1px solid ${p.myDriverMaybe ? 'var(--app-gold)' : 'var(--app-border)'}`,
                  color: p.myDriverMaybe ? 'var(--app-gold)' : 'var(--app-text2)',
                }}>
                {p.togglingMaybe ? '...' : p.myDriverMaybe ? '✓ Vielleicht' : 'Vielleicht'}
              </button>

              <button
                onClick={p.onOfferRide}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors active:scale-[0.96]"
                style={{
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  background: 'var(--app-gold)', border: '1px solid var(--app-gold)', color: '#fff',
                }}>
                Fahrt anbieten
              </button>
            </div>
          </div>
        )}

        {/* Fußzeile */}
        {p.isApproved && (p.rideRequestCount > 0 || p.driverMaybeCount > 0 || p.todayRiderCount > 0) && (
          <div className="mt-3 pt-2.5 flex items-center justify-between gap-2 flex-wrap text-[11px]"
            style={{ borderTop: '1px solid var(--app-border)' }}>
            <span className="flex items-center gap-2">
              {p.rideRequestCount > 0 && (
                <span style={{ color: 'var(--app-blue)' }}>
                  👥 {p.rideRequestCount} {p.rideRequestCount === 1 ? 'wartet' : 'warten'}
                </span>
              )}
              {p.driverMaybeCount > 0 && (
                <span style={{ color: 'var(--app-gold)' }}>
                  🚗 {p.driverMaybeCount} vielleicht
                </span>
              )}
            </span>
            {p.todayRiderCount > 0 && (
              <span style={{ color: 'var(--app-text2)' }}>
                <b style={{ color: 'var(--app-emerald)' }}>{p.todayRiderCount}</b> heute unterwegs
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
