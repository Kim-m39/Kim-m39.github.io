/* ==========================================================
   js/05-accounts.js
   Sign up, log in and log out (demo only, nothing is sent to a server)
   ========================================================== */


/* ---------- 5. Accounts (demo only: nothing is sent to a server) ---------- */

function setFieldError(field, message) {
  $('#' + field + '-error').textContent = message;
  $('#' + field + '-input').setAttribute('aria-invalid', Boolean(message));
}

function showFormError(message) {
  $('#form-error').textContent = message;
}

// Returns a message describing what is wrong with the email, or '' if it looks fine
function getEmailError(email) {
  if (!email) return 'اكتب بريدك الإلكتروني';
  if (/\s/.test(email)) return 'البريد لا يجب أن يحتوي على مسافات';

  const at = email.indexOf('@');
  if (at < 0 || at !== email.lastIndexOf('@')) return 'يجب أن يحتوي البريد على علامة @ واحدة';

  const localPart = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!localPart) return 'اكتب الجزء الذي يسبق علامة @';
  if (!domain.includes('.')) return 'اكتب النطاق كاملًا، مثل example.com';

  const validShape = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
  const badDots = /\.\./.test(email) || localPart.startsWith('.') || localPart.endsWith('.');
  if (email.length > 254 || !validShape.test(email) || badDots) {
    return 'صيغة البريد غير صحيحة، استخدم أحرفًا وأرقامًا إنجليزية فقط';
  }
  return '';
}

function checkEmailOnBlur() {
  const email = $('#email-input').value.trim().toLowerCase();
  setFieldError('email', email ? getEmailError(email) : '');
}

// The five password rules shown under the password box
const PASSWORD_RULES = {
  length: password => password.length >= 8,
  upper:  password => /[A-Z]/.test(password),
  lower:  password => /[a-z]/.test(password),
  digit:  password => /[0-9]/.test(password),
  symbol: password => /[^A-Za-z0-9\u0600-\u06FF\s]/.test(password)
};

// Tick the rules the password passes, update the strength bar.
// Returns true when every rule is met.
function updatePasswordHelp() {
  const password = $('#password-input').value;
  const total = Object.keys(PASSWORD_RULES).length;
  let passed = 0;

  document.querySelectorAll('#password-rules li').forEach(item => {
    const ok = PASSWORD_RULES[item.dataset.rule](password);
    item.classList.toggle('ok', ok);
    if (ok) passed++;
  });

  const bar = $('#strength-bar');
  bar.style.width = (password ? (passed / total) * 100 : 0) + '%';
  bar.style.background = passed < 3 ? 'var(--error)' : passed < total ? 'var(--amber)' : 'var(--ok)';

  let label = 'لم تُكتب بعد';
  if (password) label = passed < 3 ? 'ضعيفة' : passed < total ? 'متوسطة' : 'قوية';
  $('#strength-label').textContent = label;

  return passed === total;
}

function togglePasswordVisibility(button) {
  const isHidden = $('#password-input').type === 'password';
  $('#password-input').type = isHidden ? 'text' : 'password';
  $('#confirm-input').type = isHidden ? 'text' : 'password';
  button.textContent = isHidden ? 'إخفاء' : 'إظهار';
  button.setAttribute('aria-pressed', isHidden);
}

// Switch the card between "login" and "signup"
function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';

  $('#name-field').hidden = !isSignup;
  $('#confirm-field').hidden = !isSignup;
  $('#password-help').hidden = !isSignup;
  $('#tab-login').setAttribute('aria-pressed', !isSignup);
  $('#tab-signup').setAttribute('aria-pressed', isSignup);
  $('#auth-title').textContent = isSignup ? 'إنشاء حساب جديد' : 'مرحبًا بعودتك';
  $('#auth-subtitle').textContent = isSignup ? 'أنشئ حسابك لتبدأ بتنظيم دراستك.' : 'سجّل دخولك لمتابعة جدولك الأسبوعي.';
  $('#submit-button').textContent = isSignup ? 'إنشاء الحساب' : 'تسجيل الدخول';
  $('#password-input').autocomplete = isSignup ? 'new-password' : 'current-password';

  ['name', 'email', 'password', 'confirm'].forEach(field => setFieldError(field, ''));
  showFormError('');
}

function submitAuthForm(event) {
  event.preventDefault();
  showFormError('');

  const isSignup = authMode === 'signup';
  const name = $('#name-input').value.trim();
  const email = $('#email-input').value.trim().toLowerCase();
  const password = $('#password-input').value;
  let hasError = false;

  function check(field, message) {
    setFieldError(field, message);
    if (message) hasError = true;
  }

  check('name', isSignup && name.length < 2 ? 'اكتب اسمك (حرفان على الأقل)' : '');
  check('email', getEmailError(email));

  let passwordMessage = '';
  if (!password) passwordMessage = 'اكتب كلمة المرور';
  else if (isSignup && !updatePasswordHelp()) passwordMessage = 'كلمة المرور لا تحقق الشروط الموضحة أدناه';
  check('password', passwordMessage);

  check('confirm', isSignup && password && $('#confirm-input').value !== password ? 'كلمتا المرور غير متطابقتين' : '');

  if (hasError) {
    const firstInvalid = document.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  // The password itself is never saved; only the name is kept for this email
  const savedAccount = storage.get('acc:' + email, null);

  if (isSignup) {
    if (savedAccount) return showFormError('هذا البريد مسجل مسبقًا. سجّل الدخول بدلًا من ذلك.');
    storage.set('acc:' + email, { name });
  } else if (!savedAccount) {
    return showFormError('لا يوجد حساب بهذا البريد على هذا الجهاز. أنشئ حسابًا أولًا.');
  }

  currentUser = { email, name: isSignup ? name : savedAccount.name };
  storage.set('sess', currentUser);

  $('#password-input').value = '';
  $('#confirm-input').value = '';
  updatePasswordHelp();
  refreshApp();
}

function logout() {
  storage.set('sess', null);
  currentUser = null;
  refreshApp();

  // Leave the card ready for the next person: login tab, empty fields
  setAuthMode('login');
  ['name', 'email', 'password', 'confirm'].forEach(field => { $('#' + field + '-input').value = ''; });
  updatePasswordHelp();
}

// Show the login card or the app, and load the signed-in user's data
function refreshApp() {
  const isSignedIn = Boolean(currentUser);
  $('#auth-card').hidden = isSignedIn;
  $('#app').hidden = !isSignedIn;
  $('#user-box').hidden = !isSignedIn;
  $('#main-nav').hidden = !isSignedIn;
  if (!isSignedIn) return;

  $('#user-name').textContent = currentUser.name;
  entries = loadEntries();
  semesterStart = storage.get(userKey('sd'), '');
  isEditingStart = false;
  timeFormat = storage.get(userKey('tf'), deviceTimeFormat());
  userResources = storage.get(userKey('res'), {});
  favourites = storage.get(userKey('fav'), []);
  currentWeek = getCurrentSemesterWeek() || 1;
  resourcePath = [];

  renderTimeSwitch();
  closeAddPanel();
  renderResources();
  renderSemesterStartBox();
  renderWeek();
  showCurrentPage();
}
