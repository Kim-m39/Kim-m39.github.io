/* ==========================================================
   رفيق المبرمج — application logic

   1. Helpers              5. Accounts (demo, no server)
   2. Data                 6. Learning resources
   3. State                7. Weekly schedule
   4. Page navigation      8. Start
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

// Small message at the bottom of the screen
let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.opacity = 0; }, 2400);
}


/* ---------- 2. Data ---------- */

const PAGES = ['resources', 'schedule'];
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];   // Sunday to Thursday
const WEEKS = Array.from({ length: 20 }, (_, index) => index + 1);     // 1 to 20
const TYPE = { lecture: 'محاضرة', task: 'مهمة', project: 'مشروع' };

// Only Computer Science is open for now
const MAJORS = ['علوم الحاسب', 'الذكاء الاصطناعي', 'علم البيانات'];

// Computer Science study plan, level by level (index 0 = level 1)
const COURSE_PLAN = [
  [
    { code: 'QR1101', name: 'تجويد القرآن الكريم', hours: 2 },
    { code: 'IND1101', name: 'التفكير التصميمي', hours: 2 },
    { code: 'MTH1141', name: 'التفاضل والتكامل 1', hours: 3 },
    { code: 'ELIE1201', name: 'اللغة الإنجليزية (1)', hours: 4 },
    { code: 'CS1701', name: 'برمجة الحاسب بلغة جافا', hours: 3 },
    { code: 'CS1302', name: 'هياكل متقطعة 1', hours: 3 }
  ],
  [
    { code: 'QR2102', name: 'حفظ القرآن الكريم 1', hours: 2 },
    { code: 'CUR1101', name: 'مهارات جامعية', hours: 0 },
    { code: 'CS1704', name: 'البرمجة الشيئية بلغة جافا', hours: 3 },
    { code: 'MTH1602', name: 'الإحصاء والاحتمالات في الحاسبات', hours: 3 },
    { code: 'PHYS1113', name: 'الفيزياء العامة', hours: 3 },
    { code: 'ELIE1202', name: 'اللغة الإنجليزية (2)', hours: 4 },
    { code: 'CS1303', name: 'هياكل متقطعة 2', hours: 3 }
  ],
  [
    { code: 'QR2103', name: 'حفظ القرآن الكريم 2', hours: 2 },
    { code: 'AI2001', name: 'مقدمة في الذكاء الاصطناعي', hours: 2 },
    { code: 'SEC1101', name: 'مقدمة في الأمن السيبراني', hours: 3 },
    { code: 'CS2105', name: 'هياكل البيانات والخوارزميات (جافا)', hours: 3 },
    { code: 'MTH1441', name: 'الجبر الخطي', hours: 3 },
    { code: 'BIO3101', name: 'الأحياء العامة', hours: 3 },
    { code: 'CEN2011', name: 'التصميم الرقمي المنطقي', hours: 3 }
  ],
  [
    { code: 'QR3104', name: 'ختم القرآن الكريم', hours: 2 },
    { code: 'ICC1201', name: 'القيم والأخلاق', hours: 2 },
    { code: 'SE1201', name: 'أسس هندسة البرمجيات', hours: 3 },
    { code: 'DS2201', name: 'مقدمة في قواعد البيانات', hours: 3 },
    { code: 'CS2206', name: 'الرسومات بالحاسب', hours: 3 },
    { code: 'CS2107', name: 'تصميم وتحليل الخوارزميات', hours: 3 },
    { code: 'CEN2012', name: 'تنظيم وعمارة الحاسب الآلي', hours: 3 }
  ],
  [
    { code: 'CEN3011', name: 'شبكات الحاسب الآلي', hours: 3 },
    { code: 'CS3608', name: 'نظم التشغيل', hours: 4 },
    { code: 'CS3809', name: 'نظم بناء البرمجيات', hours: 3 },
    { code: 'CS3810', name: 'تطوير الويب', hours: 3 },
    { code: 'AI4101', name: 'مبادئ الذكاء الاصطناعي', hours: 3 },
    { code: 'CS3713', name: 'لغات البرمجة', hours: 2 }
  ],
  [
    { code: 'CS3901', name: 'التدريب التعاوني', hours: 6 }
  ],
  [
    { code: 'ICC4202', name: 'الأسرة في الإسلام', hours: 2 },
    { code: 'CS4901', name: 'مشروع التخرج 1', hours: 3 },
    { code: 'CS4411', name: 'قواعد البيانات المتقدمة', hours: 3 },
    { code: 'CS4612', name: 'الحوسبة المتوازية والموزعة', hours: 3 },
    { code: 'AI4202', name: 'مبادئ تعلم الآلة', hours: 3 },
    { code: 'CS4108', name: 'برمجة متقدمة', hours: 3 }
  ],
  [
    { code: 'BUS1099', name: 'مهارات التطوير المهني', hours: 2 },
    { code: 'CS4902', name: 'مشروع التخرج 2', hours: 3 },
    { code: 'CS4815', name: 'الحوسبة السحابية', hours: 2 },
    { code: 'CS4714', name: 'تركيب المترجمات', hours: 2 },
    { code: 'CS4216', name: 'الطرق العلمية', hours: 3 }
  ]
];

// Learning sources, by course code. Add more courses here as sources are found.
const RESOURCES = {
  CS1302: [
    {
      language: 'عربي',
      title: 'قائمة تشغيل: هياكل متقطعة 1',
      channel: 'kingozil',
      url: 'https://www.youtube.com/playlist?list=PLZmvN-nKumcDtrIa5t25s4WZWAesqeGuL'
    },
    {
      language: 'English',
      title: 'Playlist: Discrete Mathematics',
      channel: 'SawFin Mathematics',
      url: 'https://www.youtube.com/playlist?list=PLl-gb0E4MII28GykmtuBXNUNoej-vY5Rz'
    }
  ]
};


/* ---------- 3. State (what the app remembers while it runs) ---------- */

let currentUser = storage.get('sess', null);   // { name, email }, or null when signed out
let authMode = 'login';                         // 'login' or 'signup'
let resourcePath = [];                          // choices so far: [majorIndex, level, courseIndex]
let entries = [];                               // schedule entries of the signed-in user
let currentWeek = 1;                            // week shown in the planner
let semesterStart = '';                         // first day of classes, as 'YYYY-MM-DD'
let isEditingStart = false;

// Storage key for the signed-in user's data ("d2" = data format version 2)
const userKey = name => 'd2:' + currentUser.email + ':' + name;


/* ---------- 4. Page navigation ---------- */

// Show the page named in the address (#resources or #schedule)
function showCurrentPage() {
  let page = location.hash.slice(1);
  if (!PAGES.includes(page)) page = PAGES[0];

  PAGES.forEach(name => {
    $('#page-' + name).hidden = name !== page;
    $('[data-page="' + name + '"]').setAttribute('aria-current', name === page ? 'page' : 'false');
  });
}
addEventListener('hashchange', showCurrentPage);


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
  currentWeek = getCurrentSemesterWeek() || 1;
  resourcePath = [];

  closeAddPanel();
  renderResources();
  renderSemesterStartBox();
  renderWeek();
  showCurrentPage();
}


/* ---------- 6. Learning resources: major → level → course → sources ---------- */

function formatHours(hours) {
  if (hours === 0) return 'بدون ساعات';
  if (hours === 2) return 'ساعتان';
  return hours + ' ساعات';
}

function selectStep(value) {
  resourcePath.push(value);
  renderResources();
}

function goBackTo(stepCount) {
  resourcePath = resourcePath.slice(0, stepCount);
  renderResources();
}

function renderResources() {
  const [, level, courseIndex] = resourcePath;
  let html = renderBreadcrumbs();

  if (resourcePath.length === 0) html += renderMajorChoices();
  else if (resourcePath.length === 1) html += renderLevelChoices();
  else if (resourcePath.length === 2) html += renderCourseChoices(level);
  else html += renderCourseDetails(COURSE_PLAN[level - 1][courseIndex]);

  $('#resources-content').innerHTML = html;
}

// The row of buttons that shows the path so far and lets you go back
function renderBreadcrumbs() {
  if (resourcePath.length === 0) return '';

  const labels = ['التخصص: ' + MAJORS[resourcePath[0]]];
  if (resourcePath.length > 1) labels.push('المستوى ' + resourcePath[1]);
  if (resourcePath.length > 2) labels.push(COURSE_PLAN[resourcePath[1] - 1][resourcePath[2]].name);

  const chips = labels.map((label, index) => {
    const isLast = index === labels.length - 1;
    return `<button class="chip${isLast ? ' current' : ''}" onclick="goBackTo(${index + 1})">${escapeHtml(label)}</button>`;
  });

  return `<div class="row breadcrumbs">
    <button class="chip" onclick="goBackTo(0)">البداية</button>${chips.join('')}
  </div>`;
}

function renderMajorChoices() {
  const chips = MAJORS.map((major, index) => {
    const isOpen = index === 0;
    return isOpen
      ? `<button class="chip big" onclick="selectStep(0)">${major}</button>`
      : `<button class="chip big" disabled>${major} (قريبًا)</button>`;
  });
  return `<h3>اختر تخصصك</h3><div class="row flush">${chips.join('')}</div>`;
}

function renderLevelChoices() {
  const chips = COURSE_PLAN.map((_, index) =>
    `<button class="chip big" onclick="selectStep(${index + 1})">المستوى ${index + 1}</button>`);
  return `<h3>اختر المستوى</h3><div class="row flush">${chips.join('')}</div>`;
}

function renderCourseChoices(level) {
  const cards = COURSE_PLAN[level - 1].map((course, index) => `
    <button class="card course-card" onclick="selectStep(${index})">
      <b>${course.name}</b>
      <span class="muted"><span dir="ltr">${course.code}</span> · ${formatHours(course.hours)}</span>
      ${RESOURCES[course.code] ? '<span class="tag">مصادر</span>' : ''}
    </button>`);
  return `<h3>مواد المستوى ${level}</h3><div class="card-grid flush">${cards.join('')}</div>`;
}

function renderCourseDetails(course) {
  const sources = RESOURCES[course.code];
  let body = `<div class="empty-state">
    <b>لا توجد مصادر لهذه المادة بعد</b>
    <p class="muted">سنضيف مصادرها قريبًا.</p>
  </div>`;

  if (sources) {
    body = sources.map(source => `
      <a class="link-card" href="${source.url}" target="_blank" rel="noopener noreferrer">
        <span><b>${source.title}</b><br><span class="muted">${source.channel}</span></span>
        <span class="tag">${source.language}</span>
      </a>`).join('');
  }
  return `<h3>${course.name}</h3>${body}`;
}


/* ---------- 7. Weekly schedule ---------- */

/* --- Saving entries --- */

// Entries saved by an earlier version used short names (t, k, d, tm, a, b).
// This converts them so nobody loses their schedule.
function normalizeEntry(entry) {
  if ('title' in entry) return entry;
  return {
    id: entry.id,
    title: entry.t,
    type: entry.k,
    day: entry.d,
    time: entry.tm,
    fromWeek: entry.a,
    toWeek: entry.b
  };
}

function loadEntries() {
  return storage.get(userKey('ev'), []).map(normalizeEntry);
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

const isInWeek = (entry, week) => entry.fromWeek <= week && week <= entry.toWeek;

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

function renderEntry(entry, withDeleteButton) {
  const time = entry.time ? ` · <span dir="ltr">${escapeHtml(entry.time)}</span>` : '';
  const isMultiWeek = entry.fromWeek !== entry.toWeek;
  const weeks = withDeleteButton && isMultiWeek ? ` · الأسابيع ${entry.fromWeek} إلى ${entry.toWeek}` : '';
  const deleteButton = withDeleteButton
    ? `<button class="btn-delete" aria-label="حذف من جميع الأسابيع" onclick="deleteEntry(${entry.id})">×</button>`
    : '';

  return `<div class="entry ${typeClass(entry.type)}">
    <div><b>${escapeHtml(entry.title)}</b><div class="muted">${entry.type}${time}${weeks}</div></div>
    ${deleteButton}
  </div>`;
}

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

// One bar per project, showing which of the 20 weeks it covers
function renderTimeline() {
  const projects = entries.filter(entry => entry.type === TYPE.project);
  $('#timeline-card').hidden = projects.length === 0;

  $('#timeline').innerHTML = projects.map(project => {
    const cells = WEEKS.map(week => `<i class="${isInWeek(project, week) ? 'on' : ''}"></i>`).join('');
    return `<div class="muted">${escapeHtml(project.title)} · الأسابيع ${project.fromWeek} إلى ${project.toWeek}</div>
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

/* --- Adding and deleting entries --- */

function fillFormOptions() {
  $('#event-day').innerHTML = DAYS.map((name, index) => `<option value="${index}">${name}</option>`).join('');

  const weekOptions = WEEKS.map(week => `<option>${week}</option>`).join('');
  $('#event-from').innerHTML = weekOptions;
  $('#event-to').innerHTML = weekOptions;
}

// Lectures repeat all semester; tasks and projects start in the week being viewed
function applyDefaultWeeks() {
  const isLecture = $('#event-type').value === TYPE.lecture;
  $('#event-from').value = isLecture ? 1 : currentWeek;
  $('#event-to').value = isLecture ? 20 : currentWeek;
}

function openAddPanel() {
  $('#add-panel').hidden = false;
  applyDefaultWeeks();
  $('#event-title').focus();
}

function closeAddPanel() {
  $('#add-panel').hidden = true;
  $('#event-title').value = '';
  $('#event-time').value = '';
  $('#event-title').setAttribute('aria-invalid', 'false');
}

function saveEntry(event) {
  event.preventDefault();

  const title = $('#event-title').value.trim();
  const fromWeek = Number($('#event-from').value);
  const toWeek = Number($('#event-to').value);

  if (!title) {
    $('#event-title').setAttribute('aria-invalid', 'true');
    $('#event-title').focus();
    return showToast('اكتب عنوانًا أولًا');
  }
  if (toWeek < fromWeek) return showToast('يجب ألا يسبق الأسبوع الأخير الأسبوع الأول');

  entries.push({
    id: Date.now(),
    title,
    type: $('#event-type').value,
    day: Number($('#event-day').value),
    time: $('#event-time').value,
    fromWeek,
    toWeek
  });

  saveEntries();
  closeAddPanel();
  renderWeek();
}

function deleteEntry(id) {
  entries = entries.filter(entry => entry.id !== id);
  saveEntries();
  renderWeek();
}

// Refresh at midnight so "today" and "tomorrow" stay correct if the page stays open
let lastSeenDay = new Date().toDateString();
setInterval(() => {
  if (currentUser && lastSeenDay !== new Date().toDateString()) {
    lastSeenDay = new Date().toDateString();
    renderWeek();
  }
}, 60 * 1000);


/* ---------- 8. Start ---------- */

fillFormOptions();
refreshApp();
showCurrentPage();
