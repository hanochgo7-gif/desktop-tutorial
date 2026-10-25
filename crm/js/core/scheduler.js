// Background jobs (workflow delays, sequences, reminders). Jobs run on start and every 30s while the app is open,
// and only in one tab at a time (Web Locks), so two open tabs never send the same sequence step twice.

const jobs = new Map();
let timer = null;

export function registerJob(name, fn) { jobs.set(name, fn); }

export async function runJobs() {
  const run = async () => {
    for (const [name, fn] of jobs) {
      try { await fn(); } catch (e) { console.error(`[scheduler] job ${name} failed`, e); }
    }
  };
  if (navigator.locks?.request) {
    await navigator.locks.request('kesher-scheduler', { ifAvailable: true }, async (lock) => { if (lock) await run(); });
  } else await run();
}

export function startScheduler(intervalMs = 30000) {
  if (timer) return;
  setTimeout(runJobs, 1500);
  timer = setInterval(runJobs, intervalMs);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') runJobs(); });
}
