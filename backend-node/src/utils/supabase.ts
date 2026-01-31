/**
 * Supabase 客户端
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!supabase) {
        const url = config.supabase.url || process.env.SUPABASE_URL;
        const key = config.supabase.key || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

        console.log(`[Supabase] Initializing client... Url present: ${!!url}, Key present: ${!!key}`);

        if (!url || !key) {
            console.error('[Supabase] Missing configuration!', {
                url_missing: !url,
                key_missing: !key
            });
            throw new Error("Supabase configuration (URL or KEY) is missing. Check environment variables.");
        }

        supabase = createClient(url, key);
        console.log('[Supabase] Client created successfully');
    }
    return supabase;
}
