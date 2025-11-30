'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserCircle, LogOut } from "lucide-react";

export default function ProfileBar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      // Versuch 1: Namen aus der Datenbank-Tabelle holen
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  if (loading || !user) return null;

  // SCHLAUERE NAMENS-LOGIK:
  // 1. Schau in die Profile-Tabelle
  // 2. Wenn da nix ist, schau in die User-Metadaten (vom Login)
  // 3. Wenn da auch nix ist, nimm "Nutzer"
  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const firstName = fullName.split(' ')[0] || "Nutzer"; 

  return (
    <div className="w-full bg-white border-b px-4 py-3 flex items-center justify-end shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
        <div className="flex flex-col items-end mr-1">
          <span className="font-bold text-sm text-slate-900 leading-none">
            Salam, {firstName} 👋
          </span>
        </div>

        <div className="bg-white p-1 rounded-full border border-slate-200">
          <UserCircle className="h-6 w-6 text-slate-700" />
        </div>

        <button 
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-600 transition-colors ml-1"
          title="Abmelden"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}