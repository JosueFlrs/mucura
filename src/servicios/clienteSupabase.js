import { createClient } from '@supabase/supabase-js';

const urlSupabase = import.meta.env.VITE_SUPABASE_URL;
const clavePublicaSupabase = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const clienteSupabase = createClient(urlSupabase, clavePublicaSupabase);