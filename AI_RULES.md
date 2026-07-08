# AI Coding Guidelines & Rules for SubHSK Chinese

This document outlines the architectural rules, tech stack, and guidelines for modifying or extending the SubHSK Chinese application.

## 1. Tech Stack & Architecture
* **No React/Vue/Svelte:** This is a pure, single-page vanilla JavaScript application. Do NOT attempt to install or use React, Vue, or other frontend frameworks.
* **Single-Page Application (SPA):** The entire application shell and state management live in `index.html` and `src/styles.css`.
*   **Vite Build Tool:** The project uses Vite for development and bundling.
*   **Supabase Integration:** Supabase is used for authentication and database storage (loaded via CDN in `index.html`).
*   **HanziWriter:** Used for Chinese character stroke animations (loaded via CDN).
*   **Web Speech API:** Used for text-to-speech (TTS) and speech recognition (pronunciation grading).
*   **DeepSeek API:** Used for AI-powered writing practice and grading.

## 2. Core Development Rules

### Rule A: Maintain the Vanilla SPA Architecture
* All UI rendering functions (`render*()`), event handlers (`attachEvents()`), and state management (`let state = {...}`) must remain inside `index.html`.
* Do NOT split the UI logic into separate files unless explicitly requested.
* The application uses a **Re-render Pattern**: any state change should mutate the global `state` object and call `render()`, which completely rebuilds the DOM and re-attaches event handlers via `attachEvents()`.

### Rule B: Styling & CSS
* Do NOT use Tailwind CSS or any other CSS framework.
* All styles must be written in pure CSS inside `src/styles.css` using the established CSS custom properties (variables) and class naming conventions.
* Maintain responsiveness for both desktop and mobile layouts (using the mobile bottom navigation).

### Rule C: Icon System
* Do NOT install external icon packages.
* Use the custom inline SVG helper function `icon(name, size)` defined in `index.html` to render Lucide icons.
* If a new icon is needed, add its SVG path to the `icons` dictionary inside the `icon()` function.

### Rule D: Vocabulary Data Formats
* HSK 1-3 vocabulary uses the keys `hanzi` and `pinyin`.
* HSK 4+ vocabulary uses the keys `h` and `p`.
* Always use the fallback pattern `w.hanzi || w.h` and `w.pinyin || w.p` when accessing vocabulary properties to prevent undefined errors.
* Use the `enrichWord(w)` helper to load Hán Việt (`hv`) and example sentences (`ex`) from the flat `_ALL` arrays.

### Rule E: Error Resilience
* Always wrap rendering and scoring logic in `try-catch` blocks to prevent the entire SPA from crashing if a single component or API call fails.