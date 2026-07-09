import pg from 'pg';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const CONN = 'postgresql://postgres:kC3MG82y*D8RBS%23@db.gpmwzeurcwfiyxlomqsa.supabase.co:5432/postgres';
const { Pool } = pg;
const pool = new Pool({ connectionString: CONN, ssl: { rejectUnauthorized: false }, max: 5 });

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS words (
  id SERIAL PRIMARY KEY, hanzi TEXT NOT NULL, pinyin TEXT DEFAULT '', hv TEXT DEFAULT '',
  pos TEXT DEFAULT '', vi TEXT DEFAULT '', ex TEXT DEFAULT '',
  hsk_level SMALLINT NOT NULL CHECK (hsk_level BETWEEN 1 AND 9), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_words_hanzi ON words(hanzi);
CREATE INDEX IF NOT EXISTS idx_words_hsk ON words(hsk_level);

CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY, hsk_level SMALLINT NOT NULL, lesson_num SMALLINT NOT NULL,
  title TEXT NOT NULL, title_vi TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hsk_level, lesson_num)
);

CREATE TABLE IF NOT EXISTS grammar_points (
  id SERIAL PRIMARY KEY, hsk_level SMALLINT NOT NULL, lesson_num SMALLINT,
  gr TEXT DEFAULT '', cat TEXT DEFAULT '', cn TEXT NOT NULL, py TEXT DEFAULT '',
  vi TEXT DEFAULT '', ex TEXT DEFAULT '', eg TEXT DEFAULT '',
  sort_order SMALLINT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grammar_hsk ON grammar_points(hsk_level);

ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_points ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY pub_read_words ON words FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY pub_read_lessons ON lessons FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY pub_read_grammar ON grammar_points FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══ PERSONALIZATION TABLES ═══

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_vip BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY users_read_own_profile ON user_profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY users_insert_own_profile ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY users_update_own_profile ON user_profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_word_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hanzi TEXT NOT NULL,
  mastery TEXT DEFAULT 'learning' CHECK (mastery IN ('learning','learned','mastered')),
  hsk_level SMALLINT,
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  review_count SMALLINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hanzi)
);
CREATE INDEX IF NOT EXISTS idx_uwp_user ON user_word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_uwp_hanzi ON user_word_progress(hanzi);
ALTER TABLE user_word_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY users_manage_own_words ON user_word_progress FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_daily_activity (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  words_studied INTEGER DEFAULT 0,
  study_minutes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);
CREATE INDEX IF NOT EXISTS idx_uda_user_date ON user_daily_activity(user_id, activity_date);
ALTER TABLE user_daily_activity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY users_manage_own_activity ON user_daily_activity FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_quiz_results (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hsk_level SMALLINT,
  quiz_mode TEXT DEFAULT 'quiz',
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  percentage INTEGER DEFAULT 0,
  wrong_words JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uqr_user ON user_quiz_results(user_id);
ALTER TABLE user_quiz_results ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY users_manage_own_quizzes ON user_quiz_results FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_writing_practice (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hsk_level SMALLINT,
  sub_mode TEXT DEFAULT 'short',
  sentences JSONB DEFAULT '[]'::jsonb,
  user_inputs JSONB DEFAULT '{}'::jsonb,
  feedback JSONB,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uwp_user ON user_writing_practice(user_id);
ALTER TABLE user_writing_practice ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY users_manage_own_writing ON user_writing_practice FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_pronunciation_results (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hsk_level SMALLINT,
  context_key TEXT DEFAULT '',
  text TEXT DEFAULT '',
  recognized TEXT DEFAULT '',
  score INTEGER DEFAULT 0,
  total_chars INTEGER DEFAULT 0,
  correct_chars INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upr_user ON user_pronunciation_results(user_id);
ALTER TABLE user_pronunciation_results ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY users_manage_own_pronunciation ON user_pronunciation_results FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('word','grammar','lesson')),
  item_key TEXT NOT NULL,
  item_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_key)
);
CREATE INDEX IF NOT EXISTS idx_ub_user ON user_bookmarks(user_id);
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY users_manage_own_bookmarks ON user_bookmarks FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = await import(pathToFileURL(path.join(__dirname, 'src', 'data.js')).href);

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Creating tables...');
    await client.query(SCHEMA_SQL);
    console.log('Tables ready. Truncating...');
    await client.query('TRUNCATE words, lessons, grammar_points RESTART IDENTITY CASCADE');

    const allLevels = {1:data.HSK1_ALL,2:data.HSK2_ALL,3:data.HSK3_ALL,4:data.HSK4_ALL,5:data.HSK5_ALL,6:data.HSK6_ALL,7:data.HSK79_ALL};
    let totalW=0;
    for(const[lv,words]of Object.entries(allLevels)){
      if(!words||!words.length)continue;
      const SZ=500;
      for(let i=0;i<words.length;i+=SZ){
        const b=words.slice(i,i+SZ);
        const vals=[], pars=[];
        b.forEach((w,j)=>{const o=j*7;pars.push(w.hanzi||w.h||'',w.pinyin||w.p||'',w.hv||'',w.pos||w.ps||'',w.vi||'',w.ex||'',parseInt(lv));vals.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7})`)});
        await client.query(`INSERT INTO words(hanzi,pinyin,hv,pos,vi,ex,hsk_level) VALUES ${vals.join(',')}`,pars);
        totalW+=b.length;
      }
      console.log(`HSK ${lv}: ${words.length} words`);
    }
    console.log(`Total: ${totalW} words`);

    const ll={1:data.HSK1,2:data.HSK2,3:data.HSK3};
    for(const[lv,lessons]of Object.entries(ll)){
      if(!lessons)continue;
      const vals=[],pars=[];
      lessons.forEach((l,j)=>{const o=j*4;pars.push(parseInt(lv),l.id,l.title,l.titleVi||'');vals.push(`($${o+1},$${o+2},$${o+3},$${o+4})`)});
      await client.query(`INSERT INTO lessons(hsk_level,lesson_num,title,title_vi) VALUES ${vals.join(',')}`,pars);
      console.log(`Lessons HSK ${lv}: ${lessons.length}`);
    }

    const gm={1:data.GRAMMAR_HSK1,2:data.GRAMMAR_HSK2,3:data.GRAMMAR_HSK3,4:data.GRAMMAR_HSK4,5:data.GRAMMAR_HSK5,6:data.GRAMMAR_HSK6,7:data.GRAMMAR_HSK79G};
    let tg=0;
    for(const[lv,gd]of Object.entries(gm)){
      if(!gd)continue;
      let pts=Array.isArray(gd)?gd.map((p,i)=>({...p,ln:null,idx:i})):[];
      if(!pts.length)for(const[ln,px]of Object.entries(gd))px.forEach((p,i)=>pts.push({...p,ln:parseInt(ln),idx:i}));
      const SZ=100;
      for(let i=0;i<pts.length;i+=SZ){
        const b=pts.slice(i,i+SZ);
        const vals=[],pars=[];
        b.forEach((p,j)=>{const o=j*10;pars.push(parseInt(lv),p.ln||null,p.gr||'',p.cat||'',p.cn,p.py||'',p.vi||'',p.ex||'',JSON.stringify(p.eg||[]),p.idx);vals.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},$${o+8},$${o+9},$${o+10})`)});
        await client.query(`INSERT INTO grammar_points(hsk_level,lesson_num,gr,cat,cn,py,vi,ex,eg,sort_order) VALUES ${vals.join(',')}`,pars);
        tg+=b.length;
      }
      console.log(`Grammar HSK ${lv}: ${pts.length} points`);
    }
    console.log(`Total grammar: ${tg}`);
    console.log('DONE!');
  }finally{client.release();await pool.end()}
}
migrate().catch(e=>{console.error(e.message);process.exit(1)});
