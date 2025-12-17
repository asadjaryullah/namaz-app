'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserCircle, LogOut, Settings, Home } from "lucide-react"; 

export default function ProfileBar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Funktion zum Laden der Daten
  const fetchProfileData = async (currentUser: any) => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  useEffect(() => {
    // 1. Initialer Check
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchProfileData(user);
      }
      setLoading(false);
    };
    init();

    // 2. LISTENER: Hört auf Login/Logout Events!
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchProfileData(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); // Explizit zum Login leiten
  };

  // Solange wir laden oder kein User da ist -> Nichts anzeigen
  if (loading || !user) return null;

  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const firstName = fullName.split(' ')[0] || "Nutzer"; 

  return (
    <div className="w-full bg-white/95 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      
      <button onClick={() => router.push('/')} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
        <Home className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-1">
        
        <div 
          onClick={() => router.push('/history')} 
          className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95 group mr-1"
        >
          <div className="flex flex-col items-end">
            <span className="font-bold text-sm text-slate-900 leading-none group-hover:text-blue-700 transition-colors">
              Salam, {firstName} 👋🏼
            </span>
          </div>
          <div className="bg-white p-1 rounded-full border border-slate-200 group-hover:border-blue-300">
            <UserCircle className="h-5 w-5 text-slate-700 group-hover:text-blue-600" />
          </div>
        </div>

        <button onClick={() => router.push('/profile')} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
          <Settings className="h-5 w-5" />
        </button>

        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}