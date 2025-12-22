'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserCircle, LogOut, Settings, Home } from "lucide-react";

export default function ProfileBar() {
  const router = useRouter();
  const mountedRef = useRef(true);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (!mountedRef.current) return;
    if (!error) setProfile(data ?? null);
  };

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      // ✅ getSession ist lokal (kein Netzwerk), stabiler als getUser()
      const { data: { session } } = await supabase.auth.getSession();

      if (!mountedRef.current) return;

      const u = session?.user ?? null;
      setUser(u);

      if (u) await fetchProfile(u.id);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mountedRef.current) return;

      const u = session?.user ?? null;
      setUser(u);

      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // user vorhanden → Profil nachladen/aktualisieren
      await fetchProfile(u.id);
      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading || !user) return null;

  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const firstName = fullName.split(' ')[0] || "Nutzer";

  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
      <button
        onClick={() => router.push('/')}
        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
      >
        <Home className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => router.push('/history')}
          className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95 group mr-1"
          title="Zum Logbuch"
        >
          <div className="flex flex-col items-end">
            <span className="font-bold text-sm text-slate-900 leading-none group-hover:text-blue-700 transition-colors">
              Salam, {firstName} 👋🏼
            </span>
          </div>
          <div className="bg-white p-1 rounded-full border border-slate-200 group-hover:border-blue-300">
            <UserCircle className="h-5 w-5 text-slate-700 group-hover:text-blue-600" />
          </div>
        </button>

        <button
          onClick={() => router.push('/profile')}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Settings className="h-5 w-5" />
        </button>

        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}