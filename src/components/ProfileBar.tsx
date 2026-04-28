'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Settings, Home } from "lucide-react";

export default function ProfileBar() {
  const router = useRouter();
  const mounted = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name,gender")
      .eq("id", uid)
      .maybeSingle();
    if (!mounted.current) return;
    if (!error) setProfile(data ?? null);
  };

  useEffect(() => {
    mounted.current = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted.current) return;
      const u = session?.user ?? null;
      setUser(u);
      lastUserId.current = u?.id ?? null;
      if (u) fetchProfile(u.id);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      const u = session?.user ?? null;
      const newId = u?.id ?? null;
      if (newId === lastUserId.current) return;
      lastUserId.current = newId;
      setUser(u);
      if (!u) { setProfile(null); setLoading(false); return; }
      fetchProfile(u.id);
      setLoading(false);
    });

    return () => { mounted.current = false; subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading || !user) return null;

  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const firstName = fullName.split(" ")[0] || "Nutzer";
  const emoji = profile?.gender === 'female' ? '🧕🏻' : '🧔🏻‍♂️';

  return (
    <div
      className="w-full px-4 py-3 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md"
      style={{
        background: 'color-mix(in srgb, var(--app-surface1) 90%, transparent)',
        borderBottom: '1px solid var(--app-border)',
      }}
    >
      {/* Home */}
      <button onClick={() => router.push("/")} type="button"
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-110"
        style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}>
        <Home className="h-4 w-4" />
      </button>

      {/* Name pill */}
      <button type="button" onClick={() => router.push("/history")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-[1.02]"
        style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)' }}>
        <span className="font-bold text-sm" style={{ color: 'var(--app-text)' }}>
          Salam, {firstName}
        </span>
        <span className="text-base leading-none">{emoji}</span>
      </button>

      <div className="flex items-center gap-1">
        {/* Settings */}
        <button type="button" onClick={() => router.push("/profile")}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-110"
          style={{ background: 'var(--app-surface2)', border: '1px solid var(--app-border)', color: 'var(--app-text2)' }}>
          <Settings className="h-4 w-4" />
        </button>

        {/* Logout */}
        <button type="button" onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-110"
          style={{ background: 'rgba(240,98,146,0.1)', border: '1px solid rgba(240,98,146,0.2)', color: 'var(--app-rose)' }}>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
