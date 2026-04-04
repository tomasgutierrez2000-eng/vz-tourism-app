'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      '[Supabase] createClient(): missing env vars — ' +
        'NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
        'Authentication will not work until these are defined.'
    );
    return null;
  }
  return createBrowserClient(url, key);
}
