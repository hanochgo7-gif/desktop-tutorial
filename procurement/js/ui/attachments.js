// Attachments of a document: list, upload (PDF, images, Excel, Word up to 25 MB), open through a short-lived signed link.
// Files are never replaced or deleted; uploading again adds a new file.
import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { db, storage } from '../core/api.js';
import { store, personName } from '../core/store.js';
import { toast, toastError } from './overlay.js';
import { dateTime } from '../core/format.js';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.xlsx,.xls,.csv,.docx';
const MAX = 25 * 1024 * 1024;
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function attachmentsPanel({ entity, id, canUpload = true, title = 'קבצים מצורפים' }) {
  const list = h('ul.files', { 'aria-live': 'polite' });
  const input = h('input', { type: 'file', accept: ACCEPT, multiple: true, hidden: true });
  const upBtn = h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => input.click() }, icon('upload', 16), 'צירוף קובץ');
  const root = h('div.files__root', h('div.row-between', h('h3.sec__title', title), canUpload && !['viewer', 'auditor'].includes(store.role) ? upBtn : null), list, input);

  async function load() {
    clear(list).append(h('li.muted', 'טוען…'));
    try {
      const rows = await db('attachments').select('id,file_path,file_name,mime,size_bytes,uploaded_by,created_at').eq('entity', entity).eq('entity_id', id).order('created_at', { desc: true }).get();
      clear(list);
      if (!rows.length) { list.append(h('li.muted', 'אין קבצים מצורפים.')); return; }
      for (const f of rows) {
        list.append(h('li.file', icon('invoice', 16),
          h('button.linkbtn', { type: 'button', onclick: () => open(f) }, f.file_name),
          h('span.muted', `${size(f.size_bytes || 0)} · ${personName(f.uploaded_by)} · ${dateTime(f.created_at)}`)));
      }
    } catch (e) { clear(list).append(h('li.muted', 'לא ניתן לטעון את רשימת הקבצים.')); }
  }
  async function open(f) {
    try { const url = await storage.signedUrl(f.file_path); window.open(url, '_blank', 'noopener'); } catch (e) { toastError(e); }
  }
  input.addEventListener('change', async () => {
    const files = [...input.files]; input.value = '';
    for (const file of files) {
      if (file.size > MAX) { toast(`${file.name}: הקובץ גדול מ־25 MB`, 'bad'); continue; }
      const safe = file.name.replace(/[^\w.֐-׿-]+/g, '_').slice(-120);
      const path = `${store.org.id}/${entity}/${id}/${Date.now().toString(36)}-${safe}`;
      try {
        upBtn.disabled = true; upBtn.classList.add('is-busy');
        await storage.upload(path, file);
        await db('attachments').insert({ org_id: store.org.id, entity, entity_id: id, file_path: path, file_name: file.name.slice(0, 200), mime: file.type || null, size_bytes: file.size });
        toast(`הקובץ ${file.name} צורף`);
      } catch (e) { toastError(e); }
      finally { upBtn.disabled = false; upBtn.classList.remove('is-busy'); }
    }
    load();
  });
  load();
  return root;
}
