/* ==========================================================
   js/12-schedule-actions.js
   What the buttons on an entry do: delete, cancel a lecture, mark as done
   ========================================================== */


/* --- Deleting: choose what to delete, confirm, then "undo" for 6 seconds --- */

// Every entry with the same type and title, in all weeks. Cancelled lectures are never deleted.
const findAllWithTitle = entry =>
  entries.filter(other => other.type === entry.type && sameTitle(other, entry) && !other.cancelled);

// Called by the "حذف" button on an entry
function openDeleteDialog(id) {
  const entry = entries.find(item => item.id === id);
  if (!entry || entry.cancelled) return;

  const all = findAllWithTitle(entry);

  if (all.length === 1) {
    showDeleteConfirmation(entry, [entry], false);     // nothing to choose: go straight to the confirmation
  } else {
    showDeleteChoices(entry, all);
  }
  showDialog();
}

// Step 1: delete only this week, or every entry with this title
function showDeleteChoices(entry, all) {
  renderDialog(`حذف «${entry.title}»`, 'ماذا تريد أن تحذف؟', [
    {
      label: 'هذا الأسبوع فقط',
      detail: `الأسبوع ${entry.week}`,
      className: 'btn-secondary',
      run: () => showDeleteConfirmation(entry, [entry], true)
    },
    {
      label: `كل «${entry.title}» في جميع الأسابيع`,
      detail: itemsText(all.length),
      className: 'btn-secondary',
      run: () => showDeleteConfirmation(entry, all, true)
    },
    { label: 'إلغاء', className: 'btn-link', run: closeDialog }
  ]);
}

// Step 2: say exactly what will be deleted and ask for confirmation
function showDeleteConfirmation(entry, toDelete, canGoBack) {
  const undoNote = 'يمكنك التراجع خلال 6 ثوانٍ فقط.';
  let text;

  if (toDelete.length > 1) {
    const cancelledCount = entries.filter(other =>
      other.type === entry.type && sameTitle(other, entry) && other.cancelled).length;
    const cancelledNote = cancelledCount
      ? ` لن تُحذف المحاضرات الملغية (${itemsText(cancelledCount)}) قبل التراجع عن إلغائها.`
      : '';
    text = `سيتم حذف «${entry.title}» من جميع الأسابيع (${itemsText(toDelete.length)}).${cancelledNote} ${undoNote}`;
  } else if (canGoBack) {
    text = `سيتم حذف «${entry.title}» من الأسبوع ${entry.week} فقط، وباقي الأسابيع لا تتغير. ${undoNote}`;
  } else {
    text = `سيتم حذف «${entry.title}» من الأسبوع ${entry.week}. ${undoNote}`;
  }

  renderDialog('تأكيد الحذف', text, [
    { label: 'نعم، احذف', className: 'btn-danger', run: () => deleteEntries(toDelete) },
    {
      label: 'رجوع',
      className: 'btn-secondary',
      run: canGoBack ? () => showDeleteChoices(entry, findAllWithTitle(entry)) : closeDialog
    }
  ]);
}

function deleteEntries(list) {
  const ids = new Set(list.map(item => item.id));
  if (ids.has(editingId)) closeAddPanel();

  lastDeleted = list;
  entries = entries.filter(item => !ids.has(item.id));
  saveEntries();
  closeDialog();
  renderWeek();

  const message = list.length === 1 ? 'تم الحذف من هذا الأسبوع فقط' : `تم حذف ${itemsText(list.length)}`;
  showToast(message, { label: 'تراجع', run: undoDelete });
}

function undoDelete() {
  entries.push(...lastDeleted);
  lastDeleted = [];
  saveEntries();
  renderWeek();
}


/* --- Cancelled lectures ("محاضرة ملغية") --- */

// Turn the cancelled flag of one entry on or off
function setCancelled(id, isCancelled) {
  const entry = entries.find(item => item.id === id);
  if (!entry) return;

  entry.cancelled = isCancelled;
  saveEntries();
  renderWeek();
}

// After pressing "محاضرة ملغية": explain what it does, then ask for confirmation
function openCancelDialog(id) {
  const entry = entries.find(item => item.id === id);
  if (!entry || entry.cancelled || entry.type !== TYPE.lecture) return;

  renderDialog(
    'محاضرة ملغية',
    `سيتم وضع علامة «محاضرة ملغية» على هذه المحاضرة فقط: «${entry.title}» في الأسبوع ${entry.week}. باقي الأسابيع لا تتغير. وبعد ذلك لا يمكن تعديل هذه المحاضرة أو حذفها إلا بعد التراجع عن الإلغاء.`,
    [
      { label: 'نعم، ضع علامة محاضرة ملغية', className: 'btn-danger', run: () => cancelLecture(id) },
      { label: 'رجوع', className: 'btn-secondary', run: closeDialog }
    ],
    'هل أنت متأكد أنك تريد وضع علامة «محاضرة ملغية» على هذه المحاضرة؟'
  );
  showDialog();
}

function cancelLecture(id) {
  if (editingId === id) closeAddPanel();
  setCancelled(id, true);
  closeDialog();
  showToast('تم وضع علامة «محاضرة ملغية»', { label: 'تراجع', run: () => setCancelled(id, false) });
}

// Pressing a cancelled lecture asks whether to undo the cancelling
function openUndoCancelDialog(id) {
  const entry = entries.find(item => item.id === id);
  if (!entry || !entry.cancelled) return;

  renderDialog(
    'التراجع عن الإلغاء',
    `هذه المحاضرة ملغية: «${entry.title}» في الأسبوع ${entry.week}. لا يمكن تعديلها أو حذفها وهي ملغية.`,
    [
      { label: 'نعم، تراجع عن الإلغاء', className: 'btn-primary', run: () => undoCancel(id) },
      { label: 'لا، أبقها ملغية', className: 'btn-secondary', run: closeDialog }
    ],
    'هل تريد التراجع عن إلغاء هذه المحاضرة؟'
  );
  showDialog();
}

function undoCancel(id) {
  setCancelled(id, false);
  closeDialog();
  showToast('عادت المحاضرة كما كانت');
}

// Lets the keyboard (Enter or Space) press a cancelled lecture
function onCancelledKey(event, id) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openUndoCancelDialog(id);
  }
}

/* --- Done tasks and projects ("تم الإنجاز") --- */

// A flag only makes sense for its own type: lectures can be cancelled, tasks and projects can be done.
// This clears the other one when an entry's type is changed.
function fixFlags(entry) {
  if (entry.type === TYPE.lecture) entry.done = false;
  else entry.cancelled = false;
}

// "هذه المهمة" or "هذا المشروع"
const thisItem = entry => entry.type === TYPE.project ? 'هذا المشروع' : 'هذه المهمة';

function setDone(id, isDone) {
  const entry = entries.find(item => item.id === id);
  if (!entry) return;

  entry.done = isDone;
  saveEntries();
  renderWeek();
}

// After pressing "تم الإنجاز": explain what it does, then ask for confirmation
function openDoneDialog(id) {
  const entry = entries.find(item => item.id === id);
  if (!entry || entry.done || entry.type === TYPE.lecture) return;

  renderDialog(
    'تم الإنجاز',
    `سيتم وضع علامة «تم الإنجاز» على ${thisItem(entry)} فقط: «${entry.title}» في الأسبوع ${entry.week}. باقي الأسابيع لا تتغير. ويمكنك إزالة العلامة في أي وقت بزر «التراجع عن الإنجاز».`,
    [
      { label: 'نعم، تم الإنجاز', className: 'btn-primary', run: () => markDone(id) },
      { label: 'رجوع', className: 'btn-secondary', run: closeDialog }
    ],
    `هل أنت متأكد أنك تريد وضع علامة «تم الإنجاز» على ${thisItem(entry)}؟`
  );
  showDialog();
}

function markDone(id) {
  setDone(id, true);
  closeDialog();
  showToast('تم وضع علامة «تم الإنجاز»', { label: 'تراجع', run: () => setDone(id, false) });
}

// Removing the mark needs no question: it is harmless, and the message has an undo button
function undoDone(id) {
  setDone(id, false);
  showToast('تم التراجع عن علامة الإنجاز', { label: 'تراجع', run: () => setDone(id, true) });
}

// Refresh at midnight so "today" and "tomorrow" stay correct if the page stays open
let lastSeenDay = new Date().toDateString();
setInterval(() => {
  if (currentUser && lastSeenDay !== new Date().toDateString()) {
    lastSeenDay = new Date().toDateString();
    renderWeek();
  }
}, 60 * 1000);
