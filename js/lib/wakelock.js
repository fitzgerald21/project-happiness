// Keeps the screen on during a sit so the timer and bell keep running.
let lock = null;
let wanted = false;

async function acquire() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      lock = await navigator.wakeLock.request('screen');
    }
  } catch (e) { lock = null; }
}

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') acquire();
});

export function keepAwake() { wanted = true; acquire(); }
export function letSleep() {
  wanted = false;
  try { lock?.release(); } catch (e) { /* ignore */ }
  lock = null;
}
