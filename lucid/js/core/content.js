// Loads curriculum content (static JSON, cached by the service worker for offline use).
// Lessons are fetched on demand; files that do not exist yet resolve to null.
// Scenarios and expressions flagged as sensitive (offensive, vulgar, sexual, alcohol) are left out for learners
// under 16 (age.js), for every screen that reads them; `hidden_for_age` says how many were left out.
import { store } from './store.js';
import { forLearner } from './age.js';

const base = new URL('../../content/', import.meta.url);
const cache = new Map();

async function get(path, { optional = false } = {}) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(new URL(path, base)).then(async (r) => {
    if (!r.ok) {
      if (optional && r.status === 404) return null;
      throw new Error(`Could not load ${path} (${r.status})`);
    }
    return r.json();
  }).catch((e) => { cache.delete(path); if (optional) return null; throw e; });
  cache.set(path, p);
  return p;
}

const learner = () => { try { return store?.get('profile', 'me') || null; } catch { return null; } };
// Decided on each call, from the profile as it is now (the cached file stays complete).
const forAge = (key) => (d) => {
  if (!d || !Array.isArray(d[key])) return d;
  const { shown, hidden } = forLearner(d[key], learner());
  return hidden ? { ...d, [key]: shown, hidden_for_age: hidden } : d;
};

export const content = {
  taxonomy: () => get('taxonomy.json'),
  curriculum: () => get('curriculum.json'),
  manifest: () => get('manifest.json', { optional: true }),
  lesson: (id) => get(`lessons/${encodeURIComponent(id)}.json`, { optional: true }),
  placement: () => get('placement.json', { optional: true }),
  scenarios: () => get('real-life/scenarios.json', { optional: true }).then(forAge('scenarios')),
  slang: () => get('real-life/slang.json', { optional: true }).then(forAge('entries')),
  writingExercises: () => get('writing/exercises.json', { optional: true }),
  assignments: () => get('writing/assignments.json', { optional: true }),
  rubric: () => get('writing/rubric.json', { optional: true }),
  pictures: () => get('pictures.json', { optional: true }),
  // All lessons that exist (manifest lists them; falls back to probing nothing).
  async availableLessons() {
    const m = await this.manifest();
    return new Set(m?.lessons || []);
  },
  async allLessons() {
    const ids = [...(await this.availableLessons())];
    const list = await Promise.all(ids.map((id) => this.lesson(id)));
    return list.filter(Boolean);
  },
};

// Lookup helpers over the taxonomy.
export async function taxonomyIndex() {
  const tx = await content.taxonomy();
  return {
    tx,
    topic: new Map(tx.topics.map((x) => [x.id, x])),
    error: new Map(tx.error_types.map((x) => [x.id, x])),
    level: new Map(tx.levels.map((x) => [x.id, x])),
  };
}
