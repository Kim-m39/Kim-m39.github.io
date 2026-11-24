/* ==========================================================
   js/08-schedule-entries.js
   Schedule data: how entries are saved, dates and weeks, how one entry looks
   ========================================================== */


/* ---------- 7. Weekly schedule ---------- */

/* --- Saving entries --- */

// Every entry belongs to exactly ONE week, so each one can be edited or deleted on its own:
//   { id, title, type, mode, day, time, week }
//   type: 'محاضرة' | 'مهمة' | 'مشروع'
//   mode: 'inperson' | 'online' (lectures only, otherwise '')
//   day:  0 = Sunday ... 4 = Thursday
//   time: 'HH:MM', or '' when no time was set
// When you add something for several weeks, one separate entry is created for each week.

// Every entry needs its own id. A new id is always higher than every id used before
// (see loadEntries), so two entries can never share one.
let lastId = 0;
function newId() {
  lastId = Math.max(lastId + 1, Date.now());
  return lastId;
}

// Older versions saved ONE entry that covered a range of weeks (and even older ones used short names).
// This turns any old entry into one independent entry per week, so nobody loses their schedule.
function upgradeEntry(saved) {
  if ('week' in saved) return [saved];          // already in the current format

  const old = 'title' in saved
    ? saved
    : { title: saved.t, type: saved.k, day: saved.d, time: saved.tm, fromWeek: saved.a, toWeek: saved.b };

  const upgraded = [];
  for (let week = old.fromWeek; week <= old.toWeek; week++) {
    upgraded.push({
      id: newId(),
      title: old.title,
      type: old.type,
      mode: old.type === TYPE.lecture ? 'inperson' : '',   // old lectures had no mode: assume in person
      day: old.day,
      time: old.time,
      week
    });
  }
  return upgraded;
}

function loadEntries() {
  const saved = storage.get(userKey('ev'), []);
  lastId = Math.max(lastId, ...saved.map(entry => entry.id || 0));   // new ids must be higher than all saved ones
  return saved.flatMap(upgradeEntry);
}

function saveEntries() {
  storage.set(userKey('ev'), entries);
}

/* --- Dates: where a calendar day falls in the 20-week semester --- */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const now = () => new Date();

function formatDate(date, options) {
  try {
    return date.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', options);   // Gregorian, Latin digits
  } catch (error) {
    return date.toLocaleDateString('ar', options);
  }
}

const shortDate = date => formatDate(date, { day: 'numeric', month: 'long' });

// The Sunday that starts week 1 (the Sunday on or before the first day of classes)
function getWeekOneSunday() {
  const start = new Date(semesterStart + 'T00:00:00');
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() - start.getDay());
}

// Which semester week and weekday a calendar date is. Returns null if no start date is set.
function locateDate(date) {
  if (!semesterStart) return null;
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceWeekOne = Math.round((midnight - getWeekOneSunday()) / MS_PER_DAY);
  return { week: Math.floor(daysSinceWeekOne / 7) + 1, dayIndex: date.getDay() };
}

// Today's semester week (1 to 20), or 0 when today is outside the semester
function getCurrentSemesterWeek() {
  const position = locateDate(now());
  return position && position.week >= 1 && position.week <= 20 ? position.week : 0;
}

// The calendar date of a given week and day column
function getDateOf(week, dayIndex) {
  const sunday = getWeekOneSunday();
  return new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + (week - 1) * 7 + dayIndex);
}

// Which day column is today in the week being viewed (-1 if today is not in it)
function getTodayColumnIndex() {
  const position = locateDate(now());
  return position && position.week === currentWeek && position.dayIndex < 5 ? position.dayIndex : -1;
}

/* --- Entry helpers --- */

const isInWeek = (entry, week) => entry.week === week;

function typeClass(type) {
  if (type === TYPE.lecture) return 'lecture';
  if (type === TYPE.project) return 'project';
  return 'task';
}

// Entries without a time go last
const byTime = (a, b) => (a.time || '99').localeCompare(b.time || '99');

function entriesOn(dayIndex, week) {
  return entries.filter(entry => entry.day === dayIndex && isInWeek(entry, week)).sort(byTime);
}

// '12' if this device normally shows 12-hour time, otherwise '24'
function deviceTimeFormat() {
  const uses12Hours = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12;
  return uses12Hours ? '12' : '24';
}

// Times are always saved as 'HH:MM' (24-hour). This shows one the way the user chose:
// '14:30' in 24-hour mode, or '2:30 م' in 12-hour mode (ص = morning, م = afternoon / evening).
function formatTime(time) {
  if (!time) return '';
  if (timeFormat === '24') return time;

  const [hours, minutes] = time.split(':').map(Number);
  const period = hours < 12 ? 'ص' : 'م';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${period}`;
}

// " · 2:30 م" (empty when the entry has no time)
function renderTime(entry) {
  return entry.time ? ` · <span dir="ltr">${escapeHtml(formatTime(entry.time))}</span>` : '';
}

// Small colored tag that says "حضوري" or "عن بعد" (lectures only)
function renderModeTag(entry) {
  if (entry.type !== TYPE.lecture || !MODE_LABEL[entry.mode]) return '';
  return `<span class="mode-tag ${entry.mode}">${MODE_LABEL[entry.mode]}</span>`;
}

// One lecture / task / project.
// The edit, delete and far-left buttons only appear in the week view (withButtons).
function renderEntry(entry, withButtons) {
  if (entry.cancelled) return renderCancelledEntry(entry);

  const isLecture = entry.type === TYPE.lecture;
  const isOnline = isLecture && entry.mode === 'online';
  const isDone = !isLecture && entry.done === true;

  // The button at the far left: lectures can be cancelled, tasks and projects can be marked as done
  let farButton;
  if (isLecture) {
    farButton = `<button class="btn-mini far-end" onclick="openCancelDialog(${entry.id})">محاضرة ملغية</button>`;
  } else if (isDone) {
    farButton = `<button class="btn-mini far-end" onclick="undoDone(${entry.id})">التراجع عن الإنجاز</button>`;
  } else {
    farButton = `<button class="btn-mini far-end" onclick="openDoneDialog(${entry.id})">تم الإنجاز</button>`;
  }

  const buttons = withButtons ? `
    <div class="entry-actions">
      <button class="btn-mini" onclick="openEditPanel(${entry.id})">تعديل</button>
      <button class="btn-mini danger" onclick="openDeleteDialog(${entry.id})">حذف</button>
      ${farButton}
    </div>` : '';

  const doneTag = isDone ? '<span class="done-tag">✓ تم الإنجاز</span>' : '';

  return `<div class="entry ${typeClass(entry.type)}${isOnline ? ' online' : ''}${isDone ? ' done' : ''}" data-entry-id="${entry.id}">
    <b>${escapeHtml(entry.title)}</b>
    <div class="muted">${entry.type}${renderTime(entry)}</div>
    ${renderModeTag(entry)}
    ${doneTag}
    ${buttons}
  </div>`;
}

// A cancelled lecture is red all around and has no edit or delete buttons.
// Pressing it (or pressing Enter on it) offers to undo the cancelling.
function renderCancelledEntry(entry) {
  const label = `محاضرة ملغية: ${entry.title}. اضغط للتراجع عن الإلغاء`;

  return `<div class="entry cancelled" data-entry-id="${entry.id}" role="button" tabindex="0"
      aria-label="${escapeHtml(label)}"
      onclick="openUndoCancelDialog(${entry.id})" onkeydown="onCancelledKey(event, ${entry.id})">
    <b>${escapeHtml(entry.title)}</b>
    <div class="muted">${entry.type}${renderTime(entry)}</div>
    <span class="cancel-tag">محاضرة ملغية</span>
    <div class="cancel-hint">اضغط للتراجع عن الإلغاء</div>
  </div>`;
}
