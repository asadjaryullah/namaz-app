'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserCircle, LogOut, Settings } from "lucide-react"; // <--- Settings importieren
import { useRouter } from 'next/navigation';

export default function ProfileBar() {
  const router = useRouter();
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

  const fullName = profile?.full_name || user.user_metadata?.full_name || "";
  const firstName = fullName.split(' ')[0] || "Nutzer"; 

  return (
    <div className="w-full bg-white border-b px-4 py-3 flex items-center justify-end shadow-sm sticky top-0 z-50">
      
      <div className="flex items-center gap-2">
        
        {/* BUTTON ZUR HISTORY */}
        <div 
          onClick={() => router.push('/history')} 
          className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95 group"
          title="Zur Statistik"
        >
          <div className="flex flex-col items-end mr-1">
            <span className="font-bold text-sm text-slate-900 leading-none group-hover:text-blue-700 transition-colors">
              Salam, {firstName} 👋
            </span>
          </div>

          <div className="bg-white p-1 rounded-full border border-slate-200 group-hover:border-blue-300">
            <UserCircle className="h-6 w-6 text-slate-700 group-hover:text-blue-600" />
          </div>
        </div>

        {/* PROFIL BEARBEITEN BUTTON (NEU) */}
        <button 
          onClick={() => router.push('/profile')}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          title="Profil bearbeiten"
        >
          <Settings className="h-5 w-5" />
        </button>

        {/* LOGOUT BUTTON */}
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