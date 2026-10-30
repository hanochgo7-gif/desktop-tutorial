// Two-way sync between the local store and lucid_records. Local changes are pushed first, then
// server changes since the last cursor are pulled. The server stamps updated_at, so the newest
// write wins; a record still waiting to be pushed is never overwritten by an older server copy.

const BATCH = 400;

export function createSync({ store, api, cursorKey = () => 'lucid-sync-cursor', storage = globalThis.localStorage }) {
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
        const data = { ...record };
        delete data._dirty;
        return { coll, id: record.id, data, deleted: Boolean(record._deleted) };
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
        const local = store.get(row.coll, row.id);
        if (local?._dirty) continue; // our newer change goes up on the next push
        store.put(row.coll, { ...row.data, id: row.id, updated_at: row.updated_at, ...(row.deleted ? { _deleted: true } : {}) }, { origin: 'remote' });
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
      return { running: Boolean(running), lastError: lastError?.message || null, offline: Boolean(lastError?.network), lastSyncedAt, pending: store.dirty().length };
    },
    resetCursor() { try { storage?.removeItem(cursorKey()); } catch { /* ignore */ } },
    onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  return sync;
}
