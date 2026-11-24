/* ==========================================================
   js/07-file-viewer.js
   Opens a file you added right inside the page: images, PDFs, text, video and audio.
   Pressing a file never downloads it.
   ========================================================== */


/* ---------- Settings ---------- */

// PDFs are drawn with the pdf.js library, loaded from cdnjs the first time a PDF is opened.
// If it cannot be loaded (for example when offline), the browser's own PDF viewer is used instead.
const PDFJS_VERSION = '5.4.530';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

// File name endings that tell us what a file is when the browser does not say
const FILE_EXTENSIONS = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'],
  video: ['mp4', 'webm', 'mov', 'm4v', 'ogv'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
  text: ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'java', 'py', 'c', 'cpp', 'h', 'sql', 'log', 'ini', 'yml', 'yaml']
};

const MAX_TEXT_LENGTH = 200000;          // longer text files are cut, so the page stays fast


/* ---------- What the viewer is showing right now ---------- */

let viewerUrl = null;          // a temporary address for the file (freed after the viewer closes)
let viewerFile = null;
let viewerResource = null;
let viewerToken = 0;           // changes every time the viewer opens or closes, so old work can stop


/* ---------- Choosing how to show a file ---------- */

// 'pdf', 'image', 'video', 'audio', 'text' or 'other'
function getFileKind(file, fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const type = file.type || '';

  if (type === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (type.startsWith('image/') || FILE_EXTENSIONS.image.includes(extension)) return 'image';
  if (type.startsWith('video/') || FILE_EXTENSIONS.video.includes(extension)) return 'video';
  if (type.startsWith('audio/') || FILE_EXTENSIONS.audio.includes(extension)) return 'audio';
  if (type.startsWith('text/') || FILE_EXTENSIONS.text.includes(extension)) return 'text';
  return 'other';
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// A screenshot saved without a file type still has to look like an image to the browser
function withImageType(file, fileName) {
  if (file.type) return file;
  const extension = fileName.split('.').pop().toLowerCase();
  const type = extension === 'svg' ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  return file.slice(0, file.size, type);
}


/* ---------- Building what goes inside the viewer ---------- */

async function buildImage(file, resource) {
  const image = document.createElement('img');
  image.className = 'viewer-image';
  image.alt = resource.title;

  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('The image could not be shown'));
  });
  image.src = await readAsDataUrl(withImageType(file, resource.fileName));
  await loaded;
  return image;
}

async function buildText(file) {
  const text = await file.text();
  const pre = document.createElement('pre');
  pre.className = 'viewer-text';
  pre.dir = 'auto';                       // Arabic text reads right to left, English left to right
  pre.textContent = text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH) + '\n\n… تم عرض أول 200 ألف حرف فقط.'
    : text;
  return pre;
}

// <video> or <audio>
function buildMedia(tag) {
  const media = document.createElement(tag);
  media.className = 'viewer-media';
  media.controls = true;
  media.src = viewerUrl;
  media.onerror = () => showCannotPreview();
  return media;
}

// The browser's own PDF viewer (used when pdf.js cannot be loaded)
function buildPdfFrame() {
  const frame = document.createElement('iframe');
  frame.className = 'viewer-frame';
  frame.title = viewerResource.title;
  frame.src = viewerUrl;
  return frame;
}

// A PDF drawn page by page. Each page is only drawn when it is close to the screen.
async function buildPdf(file, token) {
  const pdfjs = await import(PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const firstPage = await pdf.getPage(1);
  const size = firstPage.getViewport({ scale: 1 });

  const container = document.createElement('div');
  container.className = 'pdf-pages';

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      drawPdfPage(pdf, entry.target, token);
    });
  }, { root: $('#viewer-content'), rootMargin: '800px' });

  for (let number = 1; number <= pdf.numPages; number++) {
    const holder = document.createElement('div');
    holder.className = 'pdf-page';
    holder.dataset.page = number;
    holder.style.aspectRatio = `${size.width} / ${size.height}`;     // keeps the space before the page is drawn
    container.append(holder);
    observer.observe(holder);
  }
  return container;
}

async function drawPdfPage(pdf, holder, token) {
  if (token !== viewerToken) return;       // the viewer was closed meanwhile

  const page = await pdf.getPage(Number(holder.dataset.page));
  const width = holder.clientWidth || 600;
  const scale = (width / page.getViewport({ scale: 1 }).width) * (window.devicePixelRatio || 1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
  if (token === viewerToken) holder.append(canvas);
}

async function buildViewerContent(file, resource, token) {
  const kind = getFileKind(file, resource.fileName);

  if (kind === 'image') return buildImage(file, resource);
  if (kind === 'text') return buildText(file);
  if (kind === 'video') return buildMedia('video');
  if (kind === 'audio') return buildMedia('audio');

  if (kind === 'pdf') {
    try {
      return await buildPdf(file, token);
    } catch (error) {
      return buildPdfFrame();               // pdf.js is not available: let the browser show the PDF
    }
  }
  return null;                              // other types cannot be shown inside a page
}


/* ---------- The viewer window ---------- */

function showViewerMessage(text) {
  const message = document.createElement('p');
  message.className = 'muted viewer-message';
  message.textContent = text;
  $('#viewer-content').replaceChildren(message);
}

// For files a browser cannot show (Word, zip, ...) or files that failed to load:
// say so, and offer two clear buttons. Nothing happens until one of them is pressed.
function showCannotPreview() {
  const card = document.createElement('div');
  card.className = 'viewer-message';
  card.innerHTML = `
    <b>لا يمكن عرض هذا الملف داخل الصفحة</b>
    <p class="muted">${escapeHtml(viewerResource.fileName)} · ${formatSize(viewerResource.fileSize)}</p>
    <div class="row" style="justify-content: center">
      <button class="btn-secondary" onclick="openViewerInNewWindow()">فتح في نافذة جديدة</button>
      <button class="btn-primary" onclick="downloadViewerFile()">تنزيل الملف</button>
    </div>`;
  $('#viewer-content').replaceChildren(card);
}

// Opens a file you added inside the page (this is what pressing a file does)
async function openFile(id) {
  const resource = findUserSource(id);
  let file = null;
  try {
    file = await fileStore.load(id);
  } catch (error) {
    file = null;
  }
  if (!resource || !file) {
    showToast('لم يُعثر على الملف على هذا الجهاز');
    return;
  }

  const token = ++viewerToken;
  viewerResource = resource;
  viewerFile = file;
  viewerUrl = URL.createObjectURL(file);

  $('#viewer-title').textContent = resource.title;
  showViewerMessage('جارٍ فتح الملف…');
  if (!$('#viewer-dialog').open) $('#viewer-dialog').showModal();

  try {
    const content = await buildViewerContent(file, resource, token);
    if (token !== viewerToken) return;
    if (content) $('#viewer-content').replaceChildren(content);
    else showCannotPreview();
  } catch (error) {
    if (token === viewerToken) showCannotPreview();
  }
}

function closeViewer() {
  $('#viewer-dialog').close();
}

// Only when the user presses this button, the file opens in a separate tab
function openViewerInNewWindow() {
  const tab = window.open(viewerUrl, '_blank');
  if (!tab) showToast('تعذّر فتح نافذة جديدة هنا. جرّب فتح الموقع في نافذة مستقلة.');
}

// Only when the user presses this button, the file is downloaded
function downloadViewerFile() {
  const link = document.createElement('a');
  link.href = viewerUrl;
  link.download = viewerResource.fileName;
  link.click();
}

// Clean up when the viewer closes: stop video and audio, stop drawing PDF pages, free the file address
$('#viewer-dialog').addEventListener('close', () => {
  viewerToken++;
  $('#viewer-content').replaceChildren();

  if (viewerUrl) {
    const url = viewerUrl;
    setTimeout(() => URL.revokeObjectURL(url), 60000);     // a little later, in case it was opened in a new tab
    viewerUrl = null;
  }
  viewerFile = null;
});

// Clicking the dark area around the viewer closes it
$('#viewer-dialog').addEventListener('click', event => {
  if (event.target === event.currentTarget) closeViewer();
});
