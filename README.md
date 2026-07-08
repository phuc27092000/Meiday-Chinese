Meiday Chinese — small HSK learning SPA

What's here:

- `index.html` — app shell, loads fonts, hanzi-writer, and the inline data.
- `src/styles.css` — extracted styles from the original single-file app.
- `vite.config.ts` — dev server config.

Quick start:

```bash
npm install
npm run dev
```

Next suggested refactors:

- Move the large vocabulary arrays into `src/data.js`.
- Implement `src/main.js` as the app logic (importing `src/data.js`).
- Add bundling for assets and linting.
