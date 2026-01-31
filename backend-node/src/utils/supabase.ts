/**
 * Supabase 客户端
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!supabase) {
        supabase = createClient(config.supabase.url, config.supabase.key);
    }
    return supabase;
}
