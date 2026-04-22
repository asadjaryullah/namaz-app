'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserCircle, LogOut, Settings, Home } from "lucide-react";

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
      .select("full_name")
      .eq("id", uid)
      .maybeSingle();

    if (!mounted.current) return;
    if (!error) setProfile(data ?? null);
  };

  useEffect(() => {
    mounted.current = true;

    const init = async () => {
      // lokal, stabil
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted.current) return;

      const u = session?.user ?? null;
      setUser(u);
      lastUserId.current = u?.id ?? null;

      if (u) fetchProfile(u.id); // nicht await -> UI blockt nicht
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;

      const u = session?.user ?? null;

      // Nur reagieren, wenn sich user wirklich geändert hat
      const newId = u?.id ?? null;
      if (newId === lastUserId.current) return;

      lastUserId.current = newId;
      setUser(u);

      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      fetchProfile(u.id); // nicht await
      setLoading(false);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading || !user) return null;

  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const firstName = fullName.split(" ")[0] || "Nutzer";

  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
      <button
        onClick={() => router.push("/")}
        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all duration-200 hover:scale-110"
        type="button"
      >
        <Home className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => router.push("/history")}
          className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm transition-all duration-200 active:scale-95 group mr-1"
          title="Zum Logbuch"
        >
          <span className="font-bold text-sm text-slate-900 leading-none group-hover:text-blue-600 transition-colors duration-200">
            Salam, {firstName} 👋🏼
          </span>
          <div className="bg-white p-1 rounded-full border border-slate-200 group-hover:border-blue-300 transition-colors duration-200">
            <UserCircle className="h-4 w-4 text-slate-600 group-hover:text-blue-600 transition-colors duration-200" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all duration-200 hover:scale-110"
        >
          <Settings className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 hover:scale-110"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}