import { createClient } from '@supabase/supabase-js';

// --- Supabase credentials (deine funktionierenden Werte) ---
const SUPABASE_URL = 'https://kaqzhlmrftlksivvjvkh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthcXpobG1yZnRsa3NpdnZqdmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Nzc1NzUsImV4cCI6MjA3NzU1MzU3NX0.nynrRnF0FfG9v5EdkP3IWhdgyegVlFtb0sFzo_H9AVo';

// --- Sicherheit & Plausibilitätscheck ---
if (!SUPABASE_URL.startsWith('https://')) {
  throw new Error('Ungültige SUPABASE_URL');
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.length < 100) {
  throw new Error('Ungültiger oder leerer SUPABASE_ANON_KEY');
}

// --- Supabase Client erzeugen ---
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);