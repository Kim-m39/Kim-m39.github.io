/* ==========================================================
   js/09-schedule-view.js
   Schedule screen: today and tomorrow, first day of the semester, the selected week
   ========================================================== */


/* --- Today and tomorrow --- */

// The list for one calendar date (used for the "today" and "tomorrow" boxes)
function renderDateList(date) {
  const message = text => `<p class="muted no-items">${text}</p>`;

  if (date.getDay() > 4) return message('عطلة نهاية الأسبوع');   // Friday or Saturday

  const { week, dayIndex } = locateDate(date);
  if (week < 1 || week > 20) return message('خارج أسابيع الفصل');

  const items = entriesOn(dayIndex, week);
  return items.length ? items.map(entry => renderEntry(entry, false)).join('') : message('لا شيء مجدول');
}

function renderToday() {
  const today = now();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const position = locateDate(today);
  const isInSemester = position && position.week >= 1 && position.week <= 20;

  $('#today-date').textContent = formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#today-week').hidden = !isInSemester;
  if (isInSemester) $('#today-week').textContent = `الأسبوع ${position.week} من 20`;

  if (!semesterStart) {
    $('#today-grid').innerHTML =
      '<p class="muted today-hint">حدّد أول يوم دراسي في الفصل ليظهر لك ما لديك اليوم وغدًا.</p>';
    return;
  }

  $('#today-grid').innerHTML = `
    <div class="today-column"><h3>اليوم</h3>${renderDateList(today)}</div>
    <div class="today-column"><h3>غدًا · ${formatDate(tomorrow, { weekday: 'long' })}</h3>${renderDateList(tomorrow)}</div>`;
}

/* --- First day of the semester --- */

function renderSemesterStartBox() {
  const box = $('#semester-start-box');

  if (semesterStart && !isEditingStart) {
    box.innerHTML = '<button class="btn-link" onclick="startEditingSemester()">تغيير تاريخ بداية الفصل</button>';
    return;
  }

  const cancelButton = semesterStart
    ? '<button class="btn-secondary" onclick="stopEditingSemester()">إلغاء</button>'
    : '';

  box.innerHTML = `
    <div class="semester-start">
      <div class="field">
        <label for="semester-start-input">أول يوم دراسي في الفصل (بداية الأسبوع 1)</label>
        <input id="semester-start-input" type="date" value="${semesterStart}">
      </div>
      <button class="btn-primary" onclick="saveSemesterStart()">حفظ</button>
      ${cancelButton}
    </div>`;
}

function startEditingSemester() {
  isEditingStart = true;
  renderSemesterStartBox();
}

function stopEditingSemester() {
  isEditingStart = false;
  renderSemesterStartBox();
}

function saveSemesterStart() {
  const value = $('#semester-start-input').value;
  if (!value) return showToast('اختر تاريخ أول يوم دراسي');

  semesterStart = value;
  isEditingStart = false;
  storage.set(userKey('sd'), semesterStart);
  currentWeek = getCurrentSemesterWeek() || 1;
  renderSemesterStartBox();
  renderWeek();
}

/* --- The selected week --- */

function renderWeek() {
  renderToday();
  renderWeekHeader();
  renderWeekChips();
  renderWeekDays();
  renderTimeline();
}

function renderWeekHeader() {
  const thisWeek = getCurrentSemesterWeek();
  $('#week-title').textContent = `الأسبوع ${currentWeek} من 20`;
  $('#week-range').textContent = semesterStart
    ? `${shortDate(getDateOf(currentWeek, 0))} – ${shortDate(getDateOf(currentWeek, 4))}`
    : '';
  $('#back-to-now').hidden = !(thisWeek && thisWeek !== currentWeek);
}

// The 20 small week buttons
function renderWeekChips() {
  const thisWeek = getCurrentSemesterWeek();

  $('#week-chips').innerHTML = WEEKS.map(week => {
    const classes = ['week-chip'];
    if (entries.some(entry => isInWeek(entry, week))) classes.push('has-entries');
    if (week === thisWeek) classes.push('is-now');

    return `<button class="${classes.join(' ')}" aria-current="${week === currentWeek}"
      aria-label="الأسبوع ${week}" onclick="goToWeek(${week})">${week}</button>`;
  }).join('');

  centerSelectedWeekChip();
}

// Scroll the row of week buttons sideways so the selected week sits in the middle
function centerSelectedWeekChip() {
  const row = $('#week-chips');
  const chip = row.querySelector('[aria-current="true"]');
  if (!chip) return;

  const rowBox = row.getBoundingClientRect();
  const chipBox = chip.getBoundingClientRect();
  row.scrollLeft += (chipBox.left + chipBox.width / 2) - (rowBox.left + rowBox.width / 2);
}

// Small date and "today" tag shown next to a day's name
function renderDayLabel(dayIndex) {
  const date = semesterStart ? `<small>${shortDate(getDateOf(currentWeek, dayIndex))}</small>` : '';
  const todayTag = dayIndex === getTodayColumnIndex() ? ' <span class="pill">اليوم</span>' : '';
  return date + todayTag;
}

function renderWeekDays() {
  if (entries.length === 0) {
    $('#week-days').innerHTML = `
      <div class="empty-state">
        <b>جدولك فارغ</b>
        <p class="muted">أضف أول محاضرة أو مهمة أو مشروع لتبدأ بتنظيم فصلك.</p>
        <button class="btn-primary" onclick="openAddPanel()">إضافة إلى الجدول</button>
      </div>`;
    return;
  }

  const weekIsEmpty = !entries.some(entry => isInWeek(entry, currentWeek));
  const emptyNote = weekIsEmpty ? '<p class="muted note">لا شيء مجدول في هذا الأسبوع.</p>' : '';

  const columns = DAYS.map((dayName, dayIndex) => {
    const todayClass = dayIndex === getTodayColumnIndex() ? ' is-today' : '';
    const items = entriesOn(dayIndex, currentWeek).map(entry => renderEntry(entry, true)).join('');
    return `<div class="day-column${todayClass}"><h3>${dayName}${renderDayLabel(dayIndex)}</h3>${items}</div>`;
  });

  $('#week-days').innerHTML = `${emptyNote}<div class="day-grid">${columns.join('')}</div>`;
}

// One bar per project, showing which of the 20 weeks have an entry for it.
// Entries with the same title count as the same project.
function renderTimeline() {
  const projects = {};      // lowercase title -> { title, weeks: [...] }

  entries.filter(entry => entry.type === TYPE.project).forEach(entry => {
    const key = entry.title.trim().toLowerCase();
    projects[key] = projects[key] || { title: entry.title, weeks: [] };
    projects[key].weeks.push(entry.week);
  });

  const list = Object.values(projects);
  $('#timeline-card').hidden = list.length === 0;

  $('#timeline').innerHTML = list.map(project => {
    const first = Math.min(...project.weeks);
    const last = Math.max(...project.weeks);
    const range = first === last ? `الأسبوع ${first}` : `الأسابيع ${first} إلى ${last}`;
    const cells = WEEKS.map(week => `<i class="${project.weeks.includes(week) ? 'on' : ''}"></i>`).join('');
    return `<div class="muted">${escapeHtml(project.title)} · ${range}</div>
      <div class="timeline-bar">${cells}</div>`;
  }).join('');
}

function goToWeek(week) {
  currentWeek = Math.max(1, Math.min(20, week));
  renderWeek();
  if (!$('#add-panel').hidden) applyDefaultWeeks();
}

function goToCurrentWeek() {
  const thisWeek = getCurrentSemesterWeek();
  if (thisWeek) goToWeek(thisWeek);
}
