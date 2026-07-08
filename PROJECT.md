# SubHSK Chinese — Project Documentation

> **Last updated:** 2026-07-09  
> **Version:** 0.1.0  
> **Purpose:** Vietnamese-language Chinese learning SPA covering HSK 1-9 vocabulary, grammar, flashcards, quizzes, reading comprehension, AI writing practice, and speech pronunciation.

---

## 📁 Project Structure

```
Meiday-Chinese/
├── index.html          # Main SPA (~2032 lines) — all JS logic, rendering, event handlers
├── src/
│   ├── data.js         # HSK vocabulary data (~11,109 lines) — HSK1-9 word lists
│   ├── styles.css      # All styling (~2,703 lines) — animations, responsive layout
│   └── main.js         # Legacy UI logic (stroke animation helpers)
├── package.json        # Vite 5 + pg dependency
├── vite.config.ts      # Vite config: host 0.0.0.0, port 5173
├── .env                # Supabase URL/keys + DeepSeek API key
├── migrate.mjs         # Database migration script
├── dist/               # Build output
└── README.md
```

**Architecture:** Single-file SPA — `index.html` contains ALL rendering functions (`render*()`), event handlers (`attachEvents()`), state management, and API integrations. `src/data.js` exports HSK vocabulary arrays. `src/styles.css` contains all styling.

**Build:** `npx vite build` → outputs to `dist/` (index.html ~0.78KB, JS ~1.5MB, CSS ~81KB). Dev server: `npx vite` on port 5173.

---

## 🧠 State Object

Centralized in `index.html` as `let state = {...}`. Key properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tab` | string | `'learn'` | Active tab: learn/review/dict/grammar/profile |
| `view` | string | `'home'` | Current view within tab |
| `level` | string | `'hsk1'` | Active HSK level (hsk1-hsk6, hsk79) |
| `lessonId` | number | null | Active lesson/set ID |
| `mode` | string | `'flashcard'` | Study mode: flashcard/list/meaning/fillin/writing |
| `rMode` | string | `'list'` | Review sub-mode (for quick review views) |
| `fcIndex` | number | 0 | Current flashcard index |
| `fcFlipped` | boolean | false | Flashcard flip state |
| `fcShuffled` | array | [] | Shuffled word list for flashcard mode |
| `quizIndex/Score/Answered/Done` | — | — | Quiz state |
| `quizQuestions` | array | [] | Generated quiz questions |
| `writingSubMode` | string | `'short'` | Writing mode: short/long |
| `writingData` | array | null | AI-generated writing exercises |
| `writingUserInputs` | object | {} | User answers for writing |
| `writingAiFeedback` | object | null | AI grading results |
| `dictSubtopic` | string | `'words'` | Dictionary subtopic |
| `dictSearch` | string | `''` | Dictionary search query |
| `isLoggedIn` | boolean | false | Supabase auth state |
| `user` | object | null | Supabase user object |
| `isVIP` | boolean | false | VIP status |
| `_reviewLevel/Mode` | string | null | Review tab level/mode selection |
| `speechRec` | object | null | Active speech recognition state |
| `speechResults` | object | {} | Pronunciation results keyed by contextKey |
| `speechProcessing` | string | null | ContextKey being processed (loading overlay) |
| `rdPinyinHidden` | boolean | false | Reading pinyin toggle state |

---

## 🔐 Auth & Lock System

**Supabase Google OAuth** via `@supabase/supabase-js` v2 (CDN).

**Lock tiers:**
- **Guest (not logged in):** HSK 1 only
- **Free (logged in, not VIP):** HSK 1-2
- **VIP:** All levels (1 through 7-9)

Functions: `getMaxUnlockedLevel()`, `isLevelLocked(lv)`, `getLockMessage(lv)`, `getLockAction(lv)`.

On home page, locked levels show card with lock message. Clicking triggers login or VIP upgrade prompt.

---

## 📚 Vocabulary Data (`src/data.js`)

| Export | Count | Format |
|--------|-------|--------|
| `HSK1` | 15 lessons × ~20 words | `{id, title, titleVi, words: [{hanzi, pinyin, vi, en, pos}]}` |
| `HSK2` | 15 lessons × ~13-18 words | same |
| `HSK3` | 18 lessons × ~24-27 words | same |
| `HSK1_ALL` | 300 words flat | `{hanzi, pinyin, hv, vi, ex, pos}` |
| `HSK2_ALL` | 200 words flat | same (hsk1-3 use `hanzi`, hsk4+ use `h`) |
| `HSK3_ALL` | 500 words flat | same |
| `HSK4_ALL` | ~XXX words | `{h, p, hv, vi, ex, ps}` (short keys) |
| `HSK5_ALL` | ~XXX words | same |
| `HSK6_ALL` | ~XXX words | same |
| `HSK79_ALL` | ~XXX words | same |

**Note:** HSK1-3 use `hanzi`/`pinyin` keys. HSK4+ use `h`/`p`/`ps` keys. Helper `enrichWord(w)` normalizes by adding `hv`/`ex` from _ALL arrays. Code always accesses via `w.hanzi||w.h`, `w.pinyin||w.p`.

HSK4-6 and HSK79 are organized into "sets" of 20 words each via `getHSK456Sets()` and `getHSK79Sets()`.

---

## 📖 Grammar Data

Grammar is organized by HSK level, stored as constants in `index.html`:

| Level | Variable | Structure | Count |
|-------|----------|-----------|-------|
| HSK 1 | `GRAMMAR_HSK1` | Object keyed by lesson number (2-15) | ~35 items |
| HSK 2 | `GRAMMAR_HSK2` | Object keyed by lesson number | ~20 items |
| HSK 3 | `GRAMMAR_HSK3` | Object keyed by lesson number (1-18) | ~60 items |
| HSK 4 | `GRAMMAR_HSK4` | Array | 21 items |
| HSK 5 | `GRAMMAR_HSK5` | Array | 13 items |
| HSK 6 | `GRAMMAR_HSK6` | Array | 8 items |
| HSK 7-9 | `GRAMMAR_HSK79G` | Array | 10 items |

Each item: `{cn (Chinese pattern), vi (Vietnamese meaning), ex (explanation), eg (examples, string or string[]), py (pinyin, optional)}`.

Grammar is displayed per-lesson below the reading section via `renderLessonGrammar()`. For HSK4-6/79, grammar items are evenly distributed across vocabulary sets.

---

## 📖 Reading Passages

15 reading passages for HSK 1 (lessons 1-15), stored in `READING_PASSAGES` object. Each passage: `{id, zh, py, vi}`. HSK 2 and HSK 3 arrays are empty (no passages yet).

**Rendering:** `renderReadingPassage(lesson)` — shows passage text with mic button for full-passage recording, pinyin toggle, speaker button, and character-by-character pronunciation scoring results with red highlighting for errors.

---

## 🎤 Speech Recognition (Pronunciation)

**Technology:** Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`), language `zh-CN`.

**Per-word (Flashcard):**
- Mic button on each flashcard → records one word
- Compares recognized text with original (punctuation removed)
- Exact match → green "100đ — Đọc chuẩn!"
- No match → red "Thử lại"

**Per-passage (Reading):**
- Single mic button for entire passage
- `continuous: true` — keeps listening, auto-restarts on `onend`
- Character-by-character comparison with ±3 window alignment (`scoreReading()`)
- Mismatched chars highlighted red with underline
- Result bar: X/Y correct (Z%) with color-coded background
- Loading overlay ("Đang chấm điểm...") during processing
- "Đọc lại" button to retry

**State:** `speechRec` (active recognition), `speechResults` (stored results), `speechProcessing` (loading indicator).

---

## ✍️ AI Writing Practice

**API:** DeepSeek (`deepseek-chat` model) via `https://api.deepseek.com/chat/completions`.

**Two modes:**
- **Short (`'short'`):** 5-8 independent sentences, different topics
- **Long (`'long'`):** One coherent 6-10 sentence essay

**Flow:**
1. User selects mode → `generateWriting()` calls DeepSeek with vocabulary-constrained prompt
2. AI returns JSON array of `{step, vi, zh, pinyin}`
3. User types Chinese for each sentence
4. "Gửi chấm toàn bộ bài" → `callDeepSeekGrading()` sends all answers for batch grading
5. AI returns per-sentence scores + per-character color coding (green=correct, red=wrong)
6. Falls back to local character-comparison grading if API unavailable

**Key functions:** `callDeepSeekWriting()`, `callDeepSeekGrading()`, `renderWriting()`, `renderWritingSetup()`, `generateLocalWritingData()`, `generateLocalGrading()`.

---

## 🗂️ Tab Structure

### 1. Trang chủ (Learn Tab)
- **Home view:** Hero with random vocab cards + progress, HSK level cards grid, quick action cards
- **Level view:** Lesson cards (HSK1-3) or set cards (HSK4-6, HSK79)
- **Lesson view:** Flashcard + Reading Passage + Grammar section

### 2. Ôn tập (Review Tab)
- **Dashboard:** 7-level selector (with lock), 3 stats (today/total/learned), 5 exercise mode cards in 2-column grid
- **Modes:** Flashcard, Chọn nghĩa (meaning quiz), Chọn từ (word selection), Điền từ (fill-in-blank), Luyện viết (writing)
- **Complete screen:** Score, XP, streak, wrong words list

### 3. Từ điển (Dictionary Tab)
- Word list with search, audio, stroke animation (HanziWriter CDN v3.5)

### 4. Ngữ pháp (Grammar Tab)
- All grammar from HSK 1 through 7-9 in expandable sections

### 5. Hồ sơ (Profile Tab)
- User info, VIP status, learned words tracking

---

## 🎨 UI System

**Icons:** Lucide icons rendered via inline SVG helper `icon(name, size)`. 30+ icons defined including: pen-line, file-text, scroll-text, bot, lightbulb, alert-triangle, check-circle, x-circle, eye, refresh-cw, volume-2, arrow-left/right, sparkles, message-square, send, star, list, book-open, shuffle, pencil, columns-2, map, user, search, menu, rotate-cw, zap, book-marked, layout-dashboard, graduation-cap, crown, x, chevron-left, mic, square, loader-2, alert-circle, lock.

**CSS:** Custom properties (--c-primary, --c-border, --c-text, --c-text-dim, etc.). No framework. Responsive with mobile bottom nav.

**Animations:** `@keyframes mic-pulse` (recording indicator), `@keyframes rd-spin` (loading spinner), fade-in transitions.

**Fonts:** Noto Sans SC, Noto Serif SC, Plus Jakarta Sans (Google Fonts CDN).

---

## 🔧 Key Functions Reference

| Function | Location | Purpose |
|----------|----------|---------|
| `render()` | index.html:472 | Main render — rebuilds entire DOM, calls `attachEvents()` |
| `attachEvents()` | index.html:~2050 | Re-attaches all event handlers after each render |
| `getLessons()` | index.html:454 | Returns HSK1/HSK2/HSK3 lesson array |
| `getAllWords()` | index.html:455 | Returns all words from HSK1+HSK2+HSK3 |
| `shuffle(arr)` | index.html:456 | Fisher-Yates shuffle |
| `speak(text)` | index.html:65 | Web Speech Synthesis TTS, lang='zh-CN' |
| `normalizeChinese(text)` | index.html:82 | Removes punctuation for comparison |
| `startSpeechRecognition()` | index.html:84 | Web Speech API recording |
| `stopSpeechRecognition()` | index.html:120 | Stop recording |
| `scoreReading()` | index.html:1465 | Character-by-character alignment & scoring |
| `renderReadingPassage()` | index.html:1478 | Reading section with mic, pinyin, results |
| `renderLessonGrammar()` | index.html:1450 | Grammar cards below reading |
| `getLessonGrammar()` | index.html:1438 | Get grammar for HSK1-3 lesson |
| `getSetGrammar()` | index.html:1444 | Distribute grammar for HSK4-6/79 sets |
| `renderFCOnePage()` | index.html:1588 | One-page flashcard renderer (used by all modes) |
| `renderReviewDashboard()` | index.html:1760 | Review tab dashboard |
| `renderSRSDashboard()` | index.html:1743 | Review tab entry point |
| `generateSRQuiz()` | index.html:1715 | Generate quiz questions for review |
| `enrichWord(w)` | index.html:1569 | Add hv/ex from _ALL arrays |
| `showToast(msg, type)` | index.html:1563 | Bottom-center toast notification |
| `isWordLearned()` | index.html:459 | Check localStorage for learned words |
| `markLearned/unlearned()` | index.html:460-461 | Track learned words in localStorage |

---

## 🚀 Commands

```bash
npm run dev        # Vite dev server on port 5173
npm run build      # Production build to dist/
npm run preview    # Preview build on port 4173
npm run tunnel     # ngrok tunnel for testing
```

---

## ⚠️ Known Issues & Conventions

1. **Reading section fragility:** Historically disappeared when functions threw errors. Now protected with 3-layer try-catch: `render()`, `renderReadingPassage()`, `scoreReading()`.
2. **State mutation:** All functions directly mutate `state` object. No immutability.
3. **Re-render pattern:** `render()` destroys and rebuilds entire DOM on every state change. Event handlers re-attached via `attachEvents()`.
4. **Mixed key formats:** HSK1-3 words use `hanzi`/`pinyin`; HSK4+ use `h`/`p`/`ps`. Always use `w.hanzi||w.h` pattern.
5. **Web Speech API:** Only works on Chrome/Edge with HTTPS or localhost. Requires microphone permission.
6. **DeepSeek API:** Requires `VITE_DEEPSEEK_KEY` in `.env`. Falls back to local data if unavailable.
7. **No framework:** Pure vanilla JS SPA. All code in one HTML file. No React/Vue/Svelte.
