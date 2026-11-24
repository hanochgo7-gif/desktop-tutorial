// Two-way sync between the local store and lucid_records. Local changes are pushed first, then
// server changes since the last cursor are pulled. The server stamps updated_at, so the newest
// write wins; a record still waiting to be pushed is never overwritten by an older server copy.
// Deletions travel as tombstones with an empty document, so deleted content leaves the server too.
// `guard` (optional) is asked before every run; sync stays idle while it returns false, for example
// before the device data has been confirmed as this account's or before the server profile exists.

const BATCH = 400;

export function createSync({ store, api, cursorKey = () => 'lucid-sync-cursor', storage = globalThis.localStorage, guard = () => true }) {
  let running = null;
  let lastError = null;
  let lastSyncedAt = null;
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn(sync.status()));

  const getCursor = () => { try { return storage?.getItem(cursorKey()) || null; } catch { return null; } };
  const setCursor = (v) => { try { storage?.setItem(cursorKey(), v); } catch { /* ignore */ } };

  async function push() {
    const dirty = store.dirty();
    for (let i = 0; i < dirty.length; i += BATCH) {
      const chunk = dirty.slice(i, i + BATCH);
      await api.pushRecords(chunk.map(({ coll, record }) => {
        if (record._deleted) return { coll, id: record.id, data: {}, deleted: true };
        const data = { ...record };
        delete data._dirty;
        return { coll, id: record.id, data, deleted: false };
      }));
      store.markClean(chunk);
    }
    return dirty.length;
  }

  async function pull() {
    let cursor = getCursor();
    let pulled = 0;
    for (;;) {
      const rows = (await api.pullRecords(cursor, 1000)) || [];
      for (const row of rows) {
        const local = store.get(row.coll, row.id, { includeDeleted: true });
        if (local?._dirty) continue; // our newer change goes up on the next push
        const rec = row.deleted ? { id: row.id, _deleted: true } : { ...row.data, id: row.id };
        store.put(row.coll, { ...rec, updated_at: row.updated_at }, { origin: 'remote' });
        pulled++;
      }
      if (rows.length) { cursor = rows[rows.length - 1].updated_at; setCursor(cursor); }
      if (rows.length < 1000) break;
    }
    return pulled;
  }

  const sync = {
    async run() {
      if (running) return running;
      if (!guard()) return { pushed: 0, pulled: 0, skipped: true };
      running = (async () => {
        try {
          const pushed = await push();
          const pulled = await pull();
          lastError = null;
          lastSyncedAt = new Date().toISOString();
          return { pushed, pulled };
        } catch (e) {
          lastError = e;
          throw e;
        } finally {
          running = null;
          notify();
        }
      })();
      notify();
      return running;
    },
    status() {
      return { running: Boolean(running), lastError: lastError?.message || null, offline: Boolean(lastError?.network), lastSyncedAt, pending: store.dirty().length, paused: !guard() };
    },
    resetCursor() { try { storage?.removeItem(cursorKey()); } catch { /* ignore */ } },
    onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  return sync;
}
