// ═══════════════════════════════════════════════════════════
// SUPABASE PERSONALIZATION — User profile, progress, history
// All personalized features stored in Supabase Postgres
// ═══════════════════════════════════════════════════════════

// Uses window.sb (Supabase client created in index.html)
function getSB() {
  if (window.sb) return window.sb;
  if (window.supabase) {
    const url = import.meta.env.VITE_SUPABASE_URL || 'https://gpmwzeurcwfiyxlomqsa.supabase.co';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbXd6ZXVyY3dmaXl4bG9tcXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTMwNzIsImV4cCI6MjA5ODAyOTA3Mn0.0G7W1OY6rqPDmzcPpGhNaUiDl6k9K0ijsME-dQjRujk';
    window.sb = window.supabase.createClient(url, key);
    return window.sb;
  }
  console.warn('[PERSONALIZATION] Supabase not available');
  return null;
}

// ═══════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════

export async function getUserProfile() {
  const sb = getSB(); if (!sb) return null;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb.from('user_profiles').select('*').eq('id', user.id).single();
    if (error && error.code !== 'PGRST116') { console.warn('getUserProfile error:', error.message); return null; }
    return data;
  } catch (e) { console.warn('getUserProfile:', e.message); return null; }
}

export async function upsertUserProfile(profile) {
  const sb = getSB(); if (!sb) return null;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const payload = {
      id: user.id,
      email: user.email,
      display_name: profile.display_name || user.user_metadata?.full_name || '',
      avatar_url: profile.avatar_url || user.user_metadata?.avatar_url || '',
      is_vip: profile.is_vip ?? false,
      preferences: profile.preferences || {},
      updated_at: new Date().toISOString()
    };
    const { data, error } = await sb.from('user_profiles').upsert(payload, { onConflict: 'id' }).select().single();
    if (error) { console.warn('upsertUserProfile:', error.message); return null; }
    return data;
  } catch (e) { console.warn('upsertUserProfile:', e.message); return null; }
}

// ═══════════════════════════════════════════
// LEARNED WORDS — sync localStorage → Supabase
// ═══════════════════════════════════════════

export async function getLearnedWordsFromCloud() {
  const sb = getSB(); if (!sb) return [];
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb.from('user_word_progress').select('hanzi,mastery,learned_at').eq('user_id', user.id);
    if (error) { console.warn('getLearnedWordsFromCloud:', error.message); return []; }
    return (data || []).map(r => r.hanzi);
  } catch (e) { console.warn('getLearnedWordsFromCloud:', e.message); return []; }
}

export async function markWordLearnedCloud(hanzi, hskLevel = null) {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('user_word_progress').upsert({
      user_id: user.id,
      hanzi: hanzi,
      mastery: 'learned',
      hsk_level: hskLevel,
      learned_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,hanzi' });
  } catch (e) { console.warn('markWordLearnedCloud:', e.message); }
}

export async function markWordUnlearnedCloud(hanzi) {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('user_word_progress').delete().eq('user_id', user.id).eq('hanzi', hanzi);
  } catch (e) { console.warn('markWordUnlearnedCloud:', e.message); }
}

export async function syncLocalLearnedToCloud() {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const local = JSON.parse(localStorage.getItem('subhsk_learned') || '[]');
    if (!local.length) return;

    const rows = local.map(hanzi => ({
      user_id: user.id,
      hanzi: hanzi,
      mastery: 'learned',
      learned_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // batch upsert in chunks of 100
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await sb.from('user_word_progress').upsert(chunk, { onConflict: 'user_id,hanzi' });
      if (error) console.warn('syncLocalLearnedToCloud chunk error:', error.message);
    }
    console.log('[PERSONALIZATION] Synced', rows.length, 'learned words to cloud');
  } catch (e) { console.warn('syncLocalLearnedToCloud:', e.message); }
}

// ═══════════════════════════════════════════
// USER STATS — total words, daily activity, streaks
// ═══════════════════════════════════════════

export async function getUserStats() {
  const sb = getSB(); if (!sb) return { totalLearned: 0, streak: 0, todayStudied: 0, quizCount: 0, avgScore: 0 };
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { totalLearned: 0, streak: 0, todayStudied: 0, quizCount: 0, avgScore: 0 };

    // Count learned words
    const { count: learnedCount, error: e1 } = await sb.from('user_word_progress')
      .select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    if (e1) console.warn('getUserStats count:', e1.message);

    // Today's activity
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayData, error: e2 } = await sb.from('user_daily_activity')
      .select('*').eq('user_id', user.id).eq('activity_date', today).single();

    // Quiz stats
    const { data: quizData, error: e3 } = await sb.from('user_quiz_results')
      .select('score,total').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    let avgScore = 0;
    if (quizData && quizData.length) {
      avgScore = Math.round(quizData.reduce((s, q) => s + (q.score / q.total * 100), 0) / quizData.length);
    }

    // Streak calculation
    const streak = await calculateStreak(user.id);

    return {
      totalLearned: learnedCount || 0,
      streak: streak,
      todayStudied: todayData?.words_studied || 0,
      todayMinutes: todayData?.study_minutes || 0,
      quizCount: quizData?.length || 0,
      avgScore: avgScore
    };
  } catch (e) { console.warn('getUserStats:', e.message); return { totalLearned: 0, streak: 0, todayStudied: 0, quizCount: 0, avgScore: 0 }; }
}

async function calculateStreak(userId) {
  const sb = getSB(); if (!sb) return 0;
  try {
    const { data, error } = await sb.from('user_daily_activity')
      .select('activity_date').eq('user_id', userId)
      .order('activity_date', { ascending: false }).limit(365);
    if (error || !data || !data.length) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < data.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().slice(0, 10);
      if (data.some(d => d.activity_date === expectedStr)) streak++;
      else if (i === 0) continue; // Skip today if not yet active
    }
    return streak;
  } catch (e) { return 0; }
}

export async function logDailyActivity(wordsStudied = 0, studyMinutes = 0) {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    await sb.from('user_daily_activity').upsert({
      user_id: user.id,
      activity_date: today,
      words_studied: wordsStudied,
      study_minutes: studyMinutes,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,activity_date' });
  } catch (e) { console.warn('logDailyActivity:', e.message); }
}

// ═══════════════════════════════════════════
// QUIZ RESULTS
// ═══════════════════════════════════════════

export async function saveQuizResult(result) {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('user_quiz_results').insert({
      user_id: user.id,
      hsk_level: result.hsk_level || null,
      quiz_mode: result.quiz_mode || 'quiz',
      score: result.score,
      total: result.total,
      percentage: result.total > 0 ? Math.round(result.score / result.total * 100) : 0,
      wrong_words: result.wrong_words || [],
      created_at: new Date().toISOString()
    });
  } catch (e) { console.warn('saveQuizResult:', e.message); }
}

export async function getQuizHistory(limit = 10) {
  const sb = getSB(); if (!sb) return [];
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb.from('user_quiz_results')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) return [];
    return data || [];
  } catch (e) { return []; }
}

// ═══════════════════════════════════════════
// WRITING PRACTICE HISTORY
// ═══════════════════════════════════════════

export async function saveWritingPractice(data) {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('user_writing_practice').insert({
      user_id: user.id,
      hsk_level: data.hsk_level || null,
      sub_mode: data.sub_mode || 'short',
      sentences: data.sentences || [],
      user_inputs: data.user_inputs || {},
      feedback: data.feedback || null,
      score: data.score || null,
      created_at: new Date().toISOString()
    });
  } catch (e) { console.warn('saveWritingPractice:', e.message); }
}

export async function getWritingHistory(limit = 5) {
  const sb = getSB(); if (!sb) return [];
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb.from('user_writing_practice')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) return [];
    return data || [];
  } catch (e) { return []; }
}

// ═══════════════════════════════════════════
// PRONUNCIATION HISTORY
// ═══════════════════════════════════════════

export async function savePronunciationResult(result) {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('user_pronunciation_results').insert({
      user_id: user.id,
      hsk_level: result.hsk_level || null,
      context_key: result.context_key || '',
      text: result.text || '',
      recognized: result.recognized || '',
      score: result.score || 0,
      total_chars: result.total_chars || result.text?.length || 0,
      correct_chars: result.correct_chars || 0,
      created_at: new Date().toISOString()
    });
  } catch (e) { console.warn('savePronunciationResult:', e.message); }
}

// ═══════════════════════════════════════════
// BOOKMARKS — favorite words & grammar
// ═══════════════════════════════════════════

export async function toggleBookmark(type, itemKey, itemData = {}) {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data: existing } = await sb.from('user_bookmarks')
      .select('id').eq('user_id', user.id).eq('item_type', type).eq('item_key', itemKey).single();

    if (existing) {
      await sb.from('user_bookmarks').delete().eq('id', existing.id);
      return false; // unbookmarked
    } else {
      await sb.from('user_bookmarks').insert({
        user_id: user.id,
        item_type: type,
        item_key: itemKey,
        item_data: itemData,
        created_at: new Date().toISOString()
      });
      return true; // bookmarked
    }
  } catch (e) { console.warn('toggleBookmark:', e.message); return null; }
}

export async function getBookmarks(type = null) {
  const sb = getSB(); if (!sb) return [];
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    let query = sb.from('user_bookmarks').select('*').eq('user_id', user.id);
    if (type) query = query.eq('item_type', type);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch (e) { return []; }
}

export async function isBookmarked(type, itemKey) {
  const sb = getSB(); if (!sb) return false;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return false;
    const { data, error } = await sb.from('user_bookmarks')
      .select('id').eq('user_id', user.id).eq('item_type', type).eq('item_key', itemKey).single();
    return !error && !!data;
  } catch (e) { return false; }
}

// ═══════════════════════════════════════════
// STUDY SESSION TRACKING
// ═══════════════════════════════════════════

let sessionStartTime = Date.now();
let sessionWordsStudied = 0;

export function trackSessionWord() {
  sessionWordsStudied++;
}

export async function endStudySession() {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const minutes = Math.round((Date.now() - sessionStartTime) / 60000);
    if (minutes < 1 && sessionWordsStudied < 1) return;

    const today = new Date().toISOString().slice(0, 10);
    // Get current today's stats
    const { data: existing } = await sb.from('user_daily_activity')
      .select('words_studied,study_minutes').eq('user_id', user.id).eq('activity_date', today).single();

    await sb.from('user_daily_activity').upsert({
      user_id: user.id,
      activity_date: today,
      words_studied: (existing?.words_studied || 0) + sessionWordsStudied,
      study_minutes: (existing?.study_minutes || 0) + Math.max(minutes, 1),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,activity_date' });

    // Reset session counters
    sessionStartTime = Date.now();
    sessionWordsStudied = 0;
  } catch (e) { console.warn('endStudySession:', e.message); }
}
