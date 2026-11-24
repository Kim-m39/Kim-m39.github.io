/* ==========================================================
   js/03-state.js
   What the site remembers while it runs (the signed-in user, the chosen week, ...)
   ========================================================== */


/* ---------- 3. State (what the app remembers while it runs) ---------- */

let currentUser = storage.get('sess', null);   // { name, email }, or null when signed out
let authMode = 'login';                         // 'login' or 'signup'
let resourcePath = [];                          // choices so far: [majorIndex, level, courseIndex]
let entries = [];                               // schedule entries of the signed-in user
let currentWeek = 1;                            // week shown in the planner
let semesterStart = '';                         // first day of classes, as 'YYYY-MM-DD'
let isEditingStart = false;
let editingId = null;                           // id of the entry being edited, or null when adding a new one
let lastDeleted = [];                           // entries that were just deleted (so "undo" can bring them back)
let timeFormat = '24';                          // how times are shown: '24' (14:30) or '12' (2:30 م)
let userResources = {};                         // sources the user added, by course code: { CS1302: [ ... ] }
let favourites = [];                            // ids of starred sources (ready-made and your own)
let sourceDraft = null;                         // what the add / edit source pop-up is working on
let lastDeletedSource = null;                   // the source that was just deleted (so "undo" can bring it back)

// Storage key for the signed-in user's data ("d2" = data format version 2)
const userKey = name => 'd2:' + currentUser.email + ':' + name;
