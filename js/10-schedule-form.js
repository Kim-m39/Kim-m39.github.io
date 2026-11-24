/* ==========================================================
   js/10-schedule-form.js
   The add / edit form, the 12/24-hour time picker, saving an entry
   ========================================================== */


/* --- Adding, editing and deleting entries --- */

function fillFormOptions() {
  $('#event-day').innerHTML = DAYS.map((name, index) => `<option value="${index}">${name}</option>`).join('');

  const weekOptions = WEEKS.map(week => `<option>${week}</option>`).join('');
  $('#event-from').innerHTML = weekOptions;
  $('#event-to').innerHTML = weekOptions;

  // Minutes 00 to 59
  $('#event-minute').innerHTML = Array.from({ length: 60 }, (_, minute) =>
    `<option>${String(minute).padStart(2, '0')}</option>`).join('');
}

/* --- The time picker in the form: hour, minute, and ص/م in 12-hour mode --- */

// The hour list depends on the format: 00-23, or 1-12. The first option, "—", means "no time".
function fillHourOptions() {
  const hours = timeFormat === '24'
    ? Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
    : Array.from({ length: 12 }, (_, index) => String(index + 1));

  $('#event-hour').innerHTML = '<option value="">—</option>' + hours.map(hour => `<option>${hour}</option>`).join('');
}

// Minutes and ص/م only make sense once an hour is chosen, and ص/م only exists in 12-hour mode
function updateTimeFields() {
  const hasHour = $('#event-hour').value !== '';
  $('#event-minute').disabled = !hasHour;
  $('#event-period').disabled = !hasHour;
  $('#event-period').hidden = timeFormat === '24';
}

// The time chosen in the form as 'HH:MM' in 24-hour form ('' when no time was chosen)
function getFormTime() {
  const hourValue = $('#event-hour').value;
  if (hourValue === '') return '';

  let hours = Number(hourValue);
  if (timeFormat === '12') {
    const isAfternoon = $('#event-period').value === 'pm';
    hours = (hours % 12) + (isAfternoon ? 12 : 0);       // 12 ص = 00, 12 م = 12
  }
  return String(hours).padStart(2, '0') + ':' + $('#event-minute').value;
}

// Show a time ('HH:MM', or '' for none) in the form's pickers
function setFormTime(time) {
  fillHourOptions();

  if (!time) {
    $('#event-hour').value = '';
    $('#event-minute').value = '00';
    $('#event-period').value = 'am';
  } else {
    const [hours, minutes] = time.split(':').map(Number);
    $('#event-hour').value = timeFormat === '24' ? String(hours).padStart(2, '0') : String(hours % 12 || 12);
    $('#event-minute').value = String(minutes).padStart(2, '0');
    $('#event-period').value = hours < 12 ? 'am' : 'pm';
  }
  updateTimeFields();
}

// Highlight the time-format button that is currently chosen
function renderTimeSwitch() {
  $('#time-24').setAttribute('aria-pressed', timeFormat === '24');
  $('#time-12').setAttribute('aria-pressed', timeFormat === '12');
}

// Called by the two buttons above "إضافة". Everything changes immediately, no confirmation.
function setTimeFormat(format) {
  if (format === timeFormat) return;

  const timeInForm = getFormTime();          // read it BEFORE changing the format, so an open form keeps its time
  timeFormat = format;
  storage.set(userKey('tf'), format);

  setFormTime(timeInForm);
  renderTimeSwitch();
  renderWeek();
}

// "1 week", "2 weeks", "3 weeks" ... written correctly in Arabic
function weeksText(count) {
  if (count === 1) return 'أسبوع واحد';
  if (count === 2) return 'أسبوعين';
  return count <= 10 ? `${count} أسابيع` : `${count} أسبوعًا`;
}

// "1 item", "2 items", "3 items" ... written correctly in Arabic
function itemsText(count) {
  if (count === 1) return 'عنصر واحد';
  if (count === 2) return 'عنصرين';
  return count <= 10 ? `${count} عناصر` : `${count} عنصرًا`;
}

// Two entries have the same title (ignoring spaces around it and upper/lower case)
const sameTitle = (a, b) => a.title.trim().toLowerCase() === b.title.trim().toLowerCase();

// Is `other` the same lecture as `entry`, in this week or a later one?
// Same type, same title and same weekday.
const isSameSeries = (other, entry) =>
  other.type === entry.type &&
  sameTitle(other, entry) &&
  other.day === entry.day &&
  other.week >= entry.week;

// What an edit of "this week and all following weeks" changes. Cancelled lectures are skipped.
const findFollowing = entry => entries.filter(other => isSameSeries(other, entry) && !other.cancelled);

// The cancelled ones that an edit like that leaves alone
const countCancelledFollowing = entry => entries.filter(other => isSameSeries(other, entry) && other.cancelled).length;

// The "apply this edit to" choice in the form: 'one' (this week only) or 'following'
function getSelectedScope() {
  return document.querySelector('input[name="scope"]:checked').value;
}

function selectScope(value) {
  document.querySelector(`input[name="scope"][value="${value}"]`).checked = true;
}

// Show only the fields that make sense:
//  - "attendance" only for lectures
//  - "to week" only when adding (an edit changes one week, so there is no range)
//  - "apply to" only when editing
function updateFormFields() {
  const isLecture = $('#event-type').value === TYPE.lecture;
  const isEditing = editingId !== null;
  const editsFollowing = isEditing && getSelectedScope() === 'following';

  $('#mode-field').hidden = !isLecture;
  $('#event-to-field').hidden = isEditing;
  $('#scope-field').hidden = !isEditing;
  $('#event-from').disabled = editsFollowing;          // every following week keeps its own week number

  $('#event-from-label').textContent = isEditing ? 'الأسبوع' : 'من الأسبوع';

  const entry = isEditing ? entries.find(item => item.id === editingId) : null;
  if (!entry) return;

  if (!editsFollowing) {
    $('#scope-hint').textContent = 'التعديل يخص هذا الأسبوع فقط، وباقي الأسابيع لا تتغير.';
    return;
  }

  const skipped = countCancelledFollowing(entry);
  const skippedNote = skipped ? ` المحاضرات الملغية (${itemsText(skipped)}) لا تتغير.` : '';
  $('#scope-hint').textContent =
    `سيتم تطبيق التعديل على ${itemsText(findFollowing(entry).length)}: «${entry.title}» في نفس اليوم، من هذا الأسبوع حتى آخر الفصل.${skippedNote}`;
}

// New lectures repeat all semester; new tasks and projects start in the week being viewed
function applyDefaultWeeks() {
  const isLecture = $('#event-type').value === TYPE.lecture;
  $('#event-from').value = isLecture ? 1 : currentWeek;
  $('#event-to').value = isLecture ? 20 : currentWeek;
}

function onTypeChange() {
  updateFormFields();
  if (editingId === null) applyDefaultWeeks();     // while editing, keep the entry's own week
}

function resetForm() {
  $('#event-title').value = '';
  $('#event-title').setAttribute('aria-invalid', 'false');
  $('#event-type').value = TYPE.lecture;
  $('#event-mode').value = 'inperson';
  $('#event-day').value = 0;
  setFormTime('');
  selectScope('one');
  updateFormFields();
  applyDefaultWeeks();
}

function showPanel() {
  $('#add-panel').hidden = false;
  $('#add-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  $('#event-title').focus();
}

function openAddPanel() {
  editingId = null;
  resetForm();
  $('#panel-title').textContent = 'إضافة إلى الجدول';
  $('#save-button').textContent = 'إضافة';
  showPanel();
}

// Open the form with one entry's current details, ready to change.
// Cancelled lectures cannot be edited, so they are refused here too.
function openEditPanel(id) {
  const entry = entries.find(item => item.id === id);
  if (!entry || entry.cancelled) return;

  editingId = id;
  $('#panel-title').textContent = `تعديل ${entry.type} (الأسبوع ${entry.week})`;
  $('#save-button').textContent = 'حفظ التعديلات';
  $('#event-title').value = entry.title;
  $('#event-title').setAttribute('aria-invalid', 'false');
  $('#event-type').value = entry.type;
  $('#event-mode').value = entry.mode || 'inperson';
  $('#event-day').value = entry.day;
  setFormTime(entry.time);
  $('#event-from').value = entry.week;
  selectScope('one');
  updateFormFields();
  showPanel();
}

function closeAddPanel() {
  $('#add-panel').hidden = true;
  editingId = null;
  resetForm();
}

function scrollToEntry(id) {
  const element = document.querySelector('#week-days [data-entry-id="' + id + '"]');
  if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function saveEntry(event) {
  event.preventDefault();

  const title = $('#event-title').value.trim();
  const type = $('#event-type').value;
  const fromWeek = Number($('#event-from').value);
  const toWeek = Number($('#event-to').value);

  if (!title) {
    $('#event-title').setAttribute('aria-invalid', 'true');
    $('#event-title').focus();
    return showToast('اكتب عنوانًا أولًا');
  }

  // Everything the form describes, except the week
  const details = {
    title,
    type,
    mode: type === TYPE.lecture ? $('#event-mode').value : '',
    day: Number($('#event-day').value),
    time: getFormTime()
  };

  const editedId = editingId;

  if (editedId !== null) {
    const entry = entries.find(item => item.id === editedId);
    if (!entry || entry.cancelled) return closeAddPanel();

    if (getSelectedScope() === 'following') {
      // The same lecture in this week and every later week. Each one keeps its own week number.
      const targets = findFollowing(entry);          // found BEFORE the changes, using the old title
      targets.forEach(target => { Object.assign(target, details); fixFlags(target); });
      showToast(`تم تعديل ${itemsText(targets.length)}`);
    } else {
      // This one entry only
      Object.assign(entry, details, { week: fromWeek });
      fixFlags(entry);
      showToast('تم حفظ التعديل');
    }
  } else {
    if (toWeek < fromWeek) return showToast('يجب ألا يسبق الأسبوع الأخير الأسبوع الأول');

    // One separate entry for every week in the range
    for (let week = fromWeek; week <= toWeek; week++) {
      entries.push({ id: newId(), ...details, week });
    }

    const count = toWeek - fromWeek + 1;
    showToast(count === 1
      ? 'تمت الإضافة'
      : `تمت الإضافة في ${weeksText(count)}، وكل أسبوع مستقل يمكن تعديله أو حذفه`);
  }

  saveEntries();
  closeAddPanel();
  renderWeek();
  if (editedId !== null) scrollToEntry(editedId);
}
