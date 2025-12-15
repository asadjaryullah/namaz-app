'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
// Alle Icons importieren
import { UserCircle, LogOut, Settings, Home } from "lucide-react"; 

export default function ProfileBar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. User Session holen
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      // 2. Profil Daten laden (mit maybeSingle für Sicherheit)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) setProfile(data);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  // Wenn noch lädt oder kein User da ist, nichts anzeigen
  if (loading || !user) return null;

  // Name oder Fallback
  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const firstName = fullName.split(' ')[0] || "Nutzer"; 

  return (
    // Sticky Header mit Blur-Effekt
    <div className="w-full bg-white/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
      
      {/* --- LINKS: HOME BUTTON --- */}
      <button 
        onClick={() => router.push('/')}
        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
        title="Zur Startseite"
      >
        <Home className="h-6 w-6" />
      </button>

      {/* --- RECHTS: MENU --- */}
      <div className="flex items-center gap-1">
        
        {/* 1. NAME & BILD (Klick -> History) */}
        <div 
          onClick={() => router.push('/history')} 
          className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95 group mr-1"
          title="Zum Logbuch & Statistik"
        >
          <div className="flex flex-col items-end">
            <span className="font-bold text-sm text-slate-900 leading-none group-hover:text-blue-700 transition-colors">
              Salam, {firstName} 👋
            </span>
          </div>

          <div className="bg-white p-1 rounded-full border border-slate-200 group-hover:border-blue-300 transition-colors">
            <UserCircle className="h-5 w-5 text-slate-700 group-hover:text-blue-600" />
          </div>
        </div>

        {/* Kleine Trennlinie für Ordnung */}
        <div className="w-px h-6 bg-slate-200 mx-1"></div>

        {/* 2. EINSTELLUNGEN (Zahnrad) */}
        <button 
          onClick={() => router.push('/profile')} 
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          title="Profil bearbeiten"
        >
          <Settings className="h-5 w-5" />
        </button>

        {/* 3. LOGOUT */}
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Abmelden"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

    </div>
  );
}