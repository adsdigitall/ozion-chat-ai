import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dpwqqszrhizqdncifkee.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwd3Fxc3pyaGl6cWRuY2lma2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODEzNDcsImV4cCI6MjA5Njc1NzM0N30.TZ-3X2knNNXDeKQWHNaleqH-ECw1cwZ0X0L03U7xnJQ';

let supabase: SupabaseClient;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

// Helper for simple queries
export async function query(table: string, options?: {
  select?: string;
  filter?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}) {
  const sb = getSupabase();
  let q = sb.from(table).select(options?.select || '*');
  
  if (options?.filter) {
    for (const [key, value] of Object.entries(options.filter)) {
      q = q.eq(key, value);
    }
  }
  
  if (options?.order) {
    q = q.order(options.order.column, { ascending: options.order.ascending ?? false });
  }
  
  if (options?.limit) {
    q = q.limit(options.limit);
  }
  
  if (options?.offset) {
    q = q.range(options.offset, options.offset + (options.limit || 10) - 1);
  }
  
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Insert helper
export async function insert(table: string, data: Record<string, any> | Record<string, any>[]) {
  const sb = getSupabase();
  const { data: result, error } = await sb.from(table).insert(data).select();
  if (error) throw error;
  return result;
}

// Update helper
export async function update(table: string, data: Record<string, any>, filter: Record<string, any>) {
  const sb = getSupabase();
  let q = sb.from(table).update(data);
  for (const [key, value] of Object.entries(filter)) {
    q = q.eq(key, value);
  }
  const { data: result, error } = await q.select();
  if (error) throw error;
  return result;
}

// Delete helper
export async function remove(table: string, filter: Record<string, any>) {
  const sb = getSupabase();
  let q = sb.from(table).delete();
  for (const [key, value] of Object.entries(filter)) {
    q = q.eq(key, value);
  }
  const { error } = await q;
  if (error) throw error;
  return true;
}

// RPC helper for custom functions
export async function rpc(functionName: string, params?: Record<string, any>) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc(functionName, params);
  if (error) throw error;
  return data;
}

export default getSupabase;
