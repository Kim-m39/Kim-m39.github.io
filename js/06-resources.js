/* ==========================================================
   js/06-resources.js
   Learning resources: major, level, course, sources, your own sources, favourites
   ========================================================== */


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
      ${hasSources(course) ? '<span class="tag">مصادر</span>' : ''}
    </button>`);
  return `<h3>مواد المستوى ${level}</h3><div class="card-grid flush">${cards.join('')}</div>`;
}

// The page of one course: the add button, then favourites, then the other sources
function renderCourseDetails(course) {
  const items = getCourseSources(course);
  const favouriteItems = items.filter(item => favourites.includes(item.id));
  const otherItems = items.filter(item => !favourites.includes(item.id));

  let body = '';
  if (items.length === 0) {
    body = `<div class="empty-state">
      <b>لا توجد مصادر لهذه المادة بعد</b>
      <p class="muted">أضف أول مصدر من عندك بالزر أعلاه.</p>
    </div>`;
  } else {
    if (favouriteItems.length > 0) body += renderSourceSection('المفضلة', favouriteItems, true);
    if (otherItems.length > 0) body += renderSourceSection(favouriteItems.length > 0 ? 'المصادر الأخرى' : 'المصادر', otherItems, false);
  }

  return `<h3>${course.name}</h3>
    <button class="btn-primary add-source" onclick="openAddSource()">أضف مصدرًا خاصًّا بك!</button>
    ${body}`;
}


/* --- Sources: ready-made ones plus the ones you add yourself (links and files) --- */

const MAX_FILE_SIZE = 20 * 1024 * 1024;       // 20 MB per file

// The course whose page is open
const getCurrentCourse = () => COURSE_PLAN[resourcePath[1] - 1][resourcePath[2]];

const hasSources = course => Boolean(RESOURCES[course.code]) || (userResources[course.code] || []).length > 0;

function saveUserResources() {
  storage.set(userKey('res'), userResources);
}

function saveFavourites() {
  storage.set(userKey('fav'), favourites);
}

// Only web links (http / https) are ever opened
const safeUrl = url => /^https?:\/\//i.test(url) ? url : '#';

// Turns what the user typed into a full web link, or '' if it is not a usable link.
// "youtube.com/watch?v=1" becomes "https://youtube.com/watch?v=1"; "javascript:..." is refused.
function normalizeUrl(text) {
  let value = text.trim();
  if (!value || /\s/.test(value)) return '';

  if (!/^https?:\/\//i.test(value)) {
    if (/^[a-z][a-z0-9+.-]*:(?!\/\/|\d)/i.test(value)) return '';     // some other kind of link (javascript:, mailto:, ...)
    value = 'https://' + value;
  }

  try {
    const url = new URL(value);
    const looksReal = url.hostname.includes('.') || url.hostname === 'localhost';
    return looksReal ? url.href : '';
  } catch (error) {
    return '';
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

// A new id for a source you add (letters and numbers only, so it is safe inside the page)
const newSourceId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* --- Files are kept in the browser's database (IndexedDB), because they are too big for localStorage --- */

const fileStore = {
  database: null,

  open() {
    if (!this.database) {
      this.database = new Promise((resolve, reject) => {
        const request = indexedDB.open('rafiq-files', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('files');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      this.database.catch(() => { this.database = null; });     // forget a failure, so the next try starts fresh
    }
    return this.database;
  },

  // Runs one database request and waits until it is completely saved
  async run(mode, makeRequest) {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('files', mode);
      const request = makeRequest(transaction.objectStore('files'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
  },

  save(id, file) { return this.run('readwrite', store => store.put(file, id)); },
  load(id) { return this.run('readonly', store => store.get(id)); },
  remove(id) { return this.run('readwrite', store => store.delete(id)); }
};

/* --- Putting the sources of a course on the page --- */

// Everything for one course: the ready-made sources first, then your own, in the order you arranged them
function getCourseSources(course) {
  const ready = (RESOURCES[course.code] || []).map(source => ({
    id: source.id,
    isMine: false,
    kind: 'link',
    title: source.title,
    subtitle: source.channel,
    tag: source.language,
    url: source.url
  }));
  const mine = (userResources[course.code] || []).map(resource => ({ ...resource, isMine: true }));
  return [...ready, ...mine];
}

// The small grey line under a source's title
function describeSource(item) {
  if (!item.isMine) return item.subtitle;
  if (item.kind === 'file') return `${item.fileName} · ${formatSize(item.fileSize)}`;

  try {
    return new URL(item.url).hostname;
  } catch (error) {
    return item.url;
  }
}

// One heading ("المفضلة" or "المصادر الأخرى") with its sources underneath
function renderSourceSection(heading, items, isFavourites) {
  // Your own sources can be moved up or down, but only among the ones in the same section
  const mineIds = items.filter(item => item.isMine).map(item => item.id);

  const cards = items.map(item => {
    const position = mineIds.indexOf(item.id);
    const canMoveUp = position > 0;
    const canMoveDown = position >= 0 && position < mineIds.length - 1;
    return renderSourceCard(item, canMoveUp, canMoveDown);
  });

  return `<section class="source-section${isFavourites ? ' favourites' : ''}">
    <h4>${heading}</h4>${cards.join('')}
  </section>`;
}

// One source: a star, the link (or file button), tags, and for your own sources the move / edit buttons
function renderSourceCard(item, canMoveUp, canMoveDown) {
  const isFavourite = favourites.includes(item.id);
  const title = escapeHtml(item.title);

  const star = `<button class="star" aria-pressed="${isFavourite}"
      aria-label="${isFavourite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}: ${title}"
      onclick="toggleFavourite('${item.id}')">${isFavourite ? '★' : '☆'}</button>`;

  const content = `<b>${title}</b><span class="muted">${escapeHtml(describeSource(item))}</span>`;
  const main = item.kind === 'file'
    ? `<button class="source-main" onclick="openFile('${item.id}')">${content}</button>`
    : `<a class="source-main" href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer">${content}</a>`;

  const tags = item.isMine
    ? `<span class="tag">${item.kind === 'file' ? 'ملف' : 'رابط'}</span><span class="tag mine">من إضافتك</span>`
    : `<span class="tag">${item.tag}</span>`;

  const tools = item.isMine ? `
    <div class="source-tools">
      <button class="btn-mini" ${canMoveUp ? '' : 'disabled'} onclick="moveSource('${item.id}', -1)">↑ للأعلى</button>
      <button class="btn-mini" ${canMoveDown ? '' : 'disabled'} onclick="moveSource('${item.id}', 1)">↓ للأسفل</button>
      <button class="btn-mini" onclick="openEditSource('${item.id}')">تعديل</button>
    </div>` : '';

  return `<div class="source">${star}${main}<div class="source-tags">${tags}</div>${tools}</div>`;
}

/* --- Favourites --- */

function toggleFavourite(id) {
  const wasFavourite = favourites.includes(id);
  favourites = wasFavourite ? favourites.filter(other => other !== id) : [...favourites, id];
  saveFavourites();
  renderResources();
  showToast(wasFavourite ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة');
}

/* --- Moving one of your own sources up or down --- */

function moveSource(id, direction) {
  const list = userResources[getCurrentCourse().code] || [];
  const isFavourite = favourites.includes(id);

  // The neighbour is the next one of YOUR sources in the same section (favourites or others)
  const sameSection = list.filter(resource => favourites.includes(resource.id) === isFavourite);
  const neighbour = sameSection[sameSection.findIndex(resource => resource.id === id) + direction];
  if (!neighbour) return;

  const from = list.findIndex(resource => resource.id === id);
  const to = list.findIndex(resource => resource.id === neighbour.id);
  [list[from], list[to]] = [list[to], list[from]];

  saveUserResources();
  renderResources();
}

/* --- The pop-up for adding or editing your own source --- */

const findUserSource = id => (userResources[getCurrentCourse().code] || []).find(resource => resource.id === id);

function closeSourceDialog() {
  $('#source-dialog').close();
}

// Clicking the dark area around the pop-up closes it
$('#source-dialog').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeSourceDialog();
});

// Step 1 (after pressing "أضف مصدرًا خاصًّا بك!"): explain, then choose a link or a file
function openAddSource() {
  sourceDraft = { kind: null, editingId: null };
  renderSourceChoice();
  $('#source-dialog').showModal();
}

function renderSourceChoice() {
  $('#source-dialog-body').innerHTML = `
    <h3 id="source-dialog-title">أضف مصدرًا خاصًّا بك</h3>
    <p class="muted">أضف مصدرك الخاص لمادة «${escapeHtml(getCurrentCourse().name)}». سيظهر مع المصادر الجاهزة في هذه الصفحة، ويمكنك تعديله وترتيبه وإضافته إلى المفضلة. تبقى مصادرك على هذا الجهاز فقط.</p>
    <p class="dialog-question">اختر طريقة الإضافة:</p>
    <div class="dialog-actions">
      <button class="btn-secondary" onclick="chooseSourceKind('link')">رابط<small>أي رابط يأخذك مباشرة إلى المصدر</small></button>
      <button class="btn-secondary" onclick="chooseSourceKind('file')">ملف<small>أي نوع من الملفات يحتوي على مصدرك</small></button>
      <button class="btn-link" onclick="closeSourceDialog()">إلغاء</button>
    </div>`;
}

function chooseSourceKind(kind) {
  sourceDraft.kind = kind;
  renderSourceForm();
}

// Step 2: the form for a link or a file. It is also used for editing a source you added.
function renderSourceForm() {
  const { kind, editingId } = sourceDraft;
  const existing = (editingId && findUserSource(editingId)) || null;
  const isEditing = existing !== null;

  const mainField = kind === 'link'
    ? `<div class="field">
         <label for="source-url">الرابط</label>
         <input id="source-url" type="text" dir="ltr" inputmode="url" autocapitalize="off" spellcheck="false"
                placeholder="https://" value="${escapeHtml(existing ? existing.url : '')}">
         <p class="hint">الصق أي رابط يفتح المصدر مباشرة.</p>
       </div>`
    : `<div class="field">
         <label for="source-file">${isEditing ? 'استبدال الملف (اختياري)' : 'الملف'}</label>
         ${isEditing ? `<p class="hint">الملف الحالي: ${escapeHtml(existing.fileName)}</p>` : ''}
         <input id="source-file" type="file">
         <p class="hint">أي نوع من الملفات، بحد أقصى 20 ميغابايت. يبقى الملف على هذا الجهاز فقط.</p>
       </div>`;

  const heading = isEditing ? 'تعديل المصدر' : (kind === 'link' ? 'إضافة رابط' : 'إضافة ملف');
  const secondButton = isEditing
    ? '<button type="button" class="btn-secondary" onclick="closeSourceDialog()">إلغاء</button>'
    : '<button type="button" class="btn-secondary" onclick="renderSourceChoice()">رجوع</button>';
  const deleteButton = isEditing
    ? `<button type="button" class="btn-link danger" onclick="openDeleteSourceDialog('${editingId}')">حذف هذا المصدر</button>`
    : '';

  $('#source-dialog-body').innerHTML = `
    <h3 id="source-dialog-title">${heading}</h3>
    <form onsubmit="saveSource(event)" novalidate>
      ${mainField}
      <div class="field">
        <label for="source-name">اسم المصدر (اختياري)</label>
        <input id="source-name" type="text" maxlength="80" value="${escapeHtml(existing ? existing.title : '')}">
        <p class="hint">اتركه فارغًا ليُستخدم ${kind === 'link' ? 'اسم موقع الرابط' : 'اسم الملف'}.</p>
      </div>
      <p class="form-error" id="source-error" role="alert"></p>
      <div class="dialog-actions">
        <button class="btn-primary" type="submit">${isEditing ? 'حفظ التعديلات' : 'إضافة'}</button>
        ${secondButton}
        ${deleteButton}
      </div>
    </form>`;

  (kind === 'link' ? $('#source-url') : $('#source-file')).focus();
}

async function saveSource(event) {
  event.preventDefault();

  const { kind, editingId } = sourceDraft;
  const course = getCurrentCourse();
  const existing = (editingId && findUserSource(editingId)) || null;
  const name = $('#source-name').value.trim();

  const submitButton = event.target.querySelector('[type="submit"]');
  submitButton.disabled = true;                 // so a double tap cannot add the source twice
  const showError = message => {
    $('#source-error').textContent = message;
    submitButton.disabled = false;
  };
  $('#source-error').textContent = '';

  const resource = existing ? { ...existing } : { id: newSourceId(), kind };

  if (kind === 'link') {
    const url = normalizeUrl($('#source-url').value);
    if (!url) return showError('اكتب رابطًا صحيحًا، مثل https://example.com');
    resource.url = url;
    resource.title = name || new URL(url).hostname;
  } else {
    const file = $('#source-file').files[0];
    if (!existing && !file) return showError('اختر ملفًا أولًا');

    if (file) {
      if (file.size > MAX_FILE_SIZE) return showError('حجم الملف أكبر من 20 ميغابايت. اختر ملفًا أصغر أو استخدم رابطًا.');
      try {
        await fileStore.save(resource.id, file);
      } catch (error) {
        return showError('تعذّر حفظ الملف في هذا المتصفح. جرّب إضافة رابط بدلًا من ذلك.');
      }
      resource.fileName = file.name;
      resource.fileType = file.type;
      resource.fileSize = file.size;
    }
    resource.title = name || resource.fileName;
  }

  const list = userResources[course.code] || [];
  if (existing) {
    list[list.findIndex(item => item.id === existing.id)] = resource;
  } else {
    list.push(resource);
  }
  userResources[course.code] = list;

  saveUserResources();
  closeSourceDialog();
  renderResources();
  showToast(existing ? 'تم حفظ التعديل' : 'تمت إضافة المصدر');
}

function openEditSource(id) {
  const resource = findUserSource(id);
  if (!resource) return;

  sourceDraft = { kind: resource.kind, editingId: id };
  renderSourceForm();
  $('#source-dialog').showModal();
}

/* --- Deleting one of your own sources (with "undo" for 6 seconds) --- */

function openDeleteSourceDialog(id) {
  const resource = findUserSource(id);
  if (!resource) return;

  closeSourceDialog();
  const fileNote = resource.kind === 'file' ? '، ويُحذف الملف من هذا الجهاز' : '';
  renderDialog(
    'حذف المصدر',
    `سيتم حذف «${resource.title}» من مصادرك${fileNote}. يمكنك التراجع خلال 6 ثوانٍ فقط.`,
    [
      { label: 'نعم، احذف', className: 'btn-danger', run: () => deleteSource(id) },
      { label: 'رجوع', className: 'btn-secondary', run: closeDialog }
    ],
    'هل أنت متأكد أنك تريد حذف هذا المصدر؟'
  );
  showDialog();
}

async function deleteSource(id) {
  const courseCode = getCurrentCourse().code;
  const list = userResources[courseCode];
  const index = list.findIndex(resource => resource.id === id);
  const resource = list[index];

  // Keep the file in memory for a moment, so "undo" can put it back
  let file = null;
  if (resource.kind === 'file') {
    try {
      file = await fileStore.load(id);
      await fileStore.remove(id);
    } catch (error) {
      // The file was already gone: nothing to remove
    }
  }

  lastDeletedSource = { courseCode, index, resource, file, wasFavourite: favourites.includes(id) };
  list.splice(index, 1);
  favourites = favourites.filter(other => other !== id);

  saveUserResources();
  saveFavourites();
  closeDialog();
  renderResources();
  showToast('تم حذف المصدر', { label: 'تراجع', run: undoDeleteSource });
}

async function undoDeleteSource() {
  if (!lastDeletedSource) return;
  const { courseCode, index, resource, file, wasFavourite } = lastDeletedSource;
  lastDeletedSource = null;

  if (file) {
    try {
      await fileStore.save(resource.id, file);
    } catch (error) {
      showToast('تعذّر استرجاع الملف');
      return;
    }
  }

  const list = userResources[courseCode] || [];
  list.splice(Math.min(index, list.length), 0, resource);
  userResources[courseCode] = list;
  if (wasFavourite) favourites.push(resource.id);

  saveUserResources();
  saveFavourites();
  renderResources();
}
