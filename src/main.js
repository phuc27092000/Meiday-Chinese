// Main UI logic moved from index.html
// Expose needed functions and initialize handlers
const hwInstances = [];
let expandedWord = null;

export function toggleWordStrokes(containerSelector, hanzi) {
  try {
    const container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
    if (!container) return;
    // find or create strokes container
    let strokesEl = container.querySelector('.word-strokes');
    if (strokesEl) {
      // toggle
      const isOpen = strokesEl.style.display !== 'none';
      strokesEl.style.display = isOpen ? 'none' : '';
      return;
    }
    strokesEl = document.createElement('div');
    strokesEl.className = 'word-strokes';
    strokesEl.style.minHeight = '120px';
    container.appendChild(strokesEl);

    if (window.HanziWriter && typeof HanziWriter.create === 'function') {
      const writer = HanziWriter.create(strokesEl, hanzi, {
        width: 120,
        height: 120,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 200,
        showOutline: true,
        showCharacter: true,
      });
      hwInstances.push(writer);
      writer.animateCharacter();
    }
    expandedWord = strokesEl;
  } catch (e) {
    console.error('toggleWordStrokes error', e);
  }
}

export function speak(text) {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.8;
    const voices = window.speechSynthesis.getVoices();
    const zh = voices.find(v => v.lang && v.lang.startsWith('zh'));
    if (zh) u.voice = zh;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.error('speak error', e);
  }
}

// Expose to global for compatibility with inline markup
window.toggleWordStrokes = toggleWordStrokes;
window.speak = speak;
window.hwInstances = hwInstances;

// DOM ready: attach any global listeners or initialization code here
document.addEventListener('DOMContentLoaded', () => {
  // Example: attach click handlers for elements that have data-hanzi attribute
  document.querySelectorAll('[data-hanzi]').forEach(el => {
    el.addEventListener('click', () => {
      const hanzi = el.getAttribute('data-hanzi');
      toggleWordStrokes(el, hanzi);
    });
  });
});
