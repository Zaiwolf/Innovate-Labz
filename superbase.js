import { createClient } from 
'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://ysttpcmxkgvycnkcwiou.supabase.co'
const supabaseKey = 'sb_publishable_Rdh0JmGNYc6ZXhACbV7XDQ_bwtFZ8br'

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

console.log("Supabase is connected!", supabase);