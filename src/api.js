// ═══════════════════════════════════════════
// SUPABASE API — Fetches vocab data from Supabase
// Fallback to local data.js if offline/error
// ═══════════════════════════════════════════
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gpmwzeurcwfiyxlomqsa.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbXd6ZXVyY3dmaXl4bG9tcXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTMwNzIsImV4cCI6MjA5ODAyOTA3Mn0.0G7W1OY6rqPDmzcPpGhNaUiDl6k9K0ijsME-dQjRujk';

async function supabaseFetch(path) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch(e) {
    console.warn('Supabase fetch failed, using local fallback:', e.message);
    return null;
  }
}

// Cache for API responses
const cache = {};

// ═══ PUBLIC API (same shape as data.js exports) ═══
export async function getHSKAll(level) {
  const lv = typeof level === 'string' ? parseInt(level.replace('hsk','').replace('79','7')) : level;
  const key = `all_${lv}`;
  if (cache[key]) return cache[key];
  const data = await supabaseFetch(`words?hsk_level=eq.${lv}&select=hanzi,pinyin,hv,pos,vi,ex&order=id`);
  if (data && data.length) { cache[key] = data; return data; }
  return null;
}

export async function getHSKLessons(level) {
  const lv = typeof level === 'string' ? parseInt(level.replace('hsk','').replace('79','7')) : level;
  const key = `lessons_${lv}`;
  if (cache[key]) return cache[key];
  const data = await supabaseFetch(`lessons?hsk_level=eq.${lv}&select=id,lesson_num,title,title_vi&order=lesson_num`);
  if (data && data.length) { cache[key] = data; return data; }
  return null;
}

export async function getGrammarPoints(level) {
  const lv = typeof level === 'string' ? parseInt(level.replace('hsk','').replace('79','7')) : level;
  const key = `grammar_${lv}`;
  if (cache[key]) return cache[key];
  const data = await supabaseFetch(`grammar_points?hsk_level=eq.${lv}&select=*&order=sort_order`);
  if (data && data.length) { cache[key] = data; return data; }
  return null;
}

// Search words across all levels
export async function searchWords(query, limit = 100) {
  const q = encodeURIComponent(`%${query}%`);
  const data = await supabaseFetch(`words?or=(hanzi.ilike.${q},pinyin.ilike.${q},vi.ilike.${q})&limit=${limit}`);
  return data || [];
}
