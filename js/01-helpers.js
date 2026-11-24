/* ==========================================================
   js/01-helpers.js
   Small tools used everywhere: finding elements, safe text, saving data, messages
   ========================================================== */


/* ---------- 1. Helpers ---------- */

const $ = selector => document.querySelector(selector);

// Make text typed by the user safe to put inside HTML
function escapeHtml(text) {
  const replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text).replace(/[&<>"']/g, char => replacements[char]);
}

// Save and load data in the browser (localStorage).
// If the browser blocks storage, the data is kept in memory until the page closes.
const memory = {};
const storage = {
  get(key, fallback) {
    if (key in memory) return memory[key];
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    memory[key] = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Storage is blocked: nothing else to do
    }
  }
};

// Small message at the bottom of the screen.
// It can also carry one button, for example { label: 'تراجع', run: undoDelete }.
let toastTimer;
function showToast(message, action) {
  const toast = $('#toast');
  toast.textContent = message;

  if (action) {
    const button = document.createElement('button');
    button.textContent = action.label;
    button.onclick = () => { action.run(); hideToast(); };
    toast.append(button);
  }

  toast.style.pointerEvents = action ? 'auto' : 'none';
  toast.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, action ? 6000 : 2400);
}

function hideToast() {
  $('#toast').style.opacity = 0;
  $('#toast').style.pointerEvents = 'none';
}
