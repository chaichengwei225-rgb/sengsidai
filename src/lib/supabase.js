import { createClient } from '@supabase/supabase-js';

// 获取配置：优先环境变量，其次 localStorage
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const localUrl = localStorage.getItem('WALLET_WAIT_SUPABASE_URL');
  const localKey = localStorage.getItem('WALLET_WAIT_SUPABASE_KEY');

  const url = (envUrl && envUrl.trim() && !envUrl.includes('your-project-id')) ? envUrl.trim() : (localUrl || '').trim();
  const key = (envKey && envKey.trim() && !envKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) ? envKey.trim() : (localKey || '').trim();

  return { url, key, isCustom: Boolean(!envUrl && localUrl) };
}

let supabaseInstance = null;

export function getSupabase() {
  const { url, key } = getSupabaseCredentials();

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export function saveSupabaseCredentials(url, key) {
  if (url && key) {
    localStorage.setItem('WALLET_WAIT_SUPABASE_URL', url.trim());
    localStorage.setItem('WALLET_WAIT_SUPABASE_KEY', key.trim());
  } else {
    localStorage.removeItem('WALLET_WAIT_SUPABASE_URL');
    localStorage.removeItem('WALLET_WAIT_SUPABASE_KEY');
  }
  supabaseInstance = null;
  window.dispatchEvent(new CustomEvent('supabase_config_changed'));
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http'));
}
