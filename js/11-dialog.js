/* ==========================================================
   js/11-dialog.js
   The pop-up box used to explain and to ask for confirmation
   ========================================================== */


/* --- The pop-up dialog (used for deleting, cancelled lectures and done marks) --- */

// Fill the dialog with a heading, a sentence, an optional bold question and a list of buttons.
// Each button is { label, detail, className, run }; "detail" is smaller text shown under the label.
function renderDialog(heading, text, buttons, question = '') {
  $('#dialog-title').textContent = heading;
  $('#dialog-text').textContent = text;
  $('#dialog-question').textContent = question;
  $('#dialog-question').hidden = question === '';

  const actions = $('#dialog-actions');
  actions.innerHTML = '';
  buttons.forEach(({ label, detail, className, run }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.onclick = run;

    if (detail) {
      const note = document.createElement('small');
      note.textContent = detail;
      button.append(note);
    }
    actions.append(button);
  });
}

function showDialog() {
  if (!$('#app-dialog').open) $('#app-dialog').showModal();
}

function closeDialog() {
  $('#app-dialog').close();
}

// Clicking the dark area around the dialog closes it
$('#app-dialog').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeDialog();
});
