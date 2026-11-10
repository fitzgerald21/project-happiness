// The "I'm done here" overlay: three slow breaths, then go live your life.
import { BREATH_PATTERNS } from './content.js';

export function putDown() {
  const host = document.getElementById('overlay');
  const phases = BREATH_PATTERNS.calm.phases;
  host.innerHTML = `
    <div class="putdown" role="dialog" aria-label="Put the phone down">
      <div class="breath-wrap"><div class="breath-circle" id="pd-circle"></div></div>
      <p class="pd-label" id="pd-label">Three slow breaths</p>
      <p class="pd-sub" id="pd-sub">Then put the phone face down.</p>
      <button class="btn ghost" id="pd-close">Close</button>
    </div>`;
  host.classList.add('open');
  const circle = host.querySelector('#pd-circle');
  const label = host.querySelector('#pd-label');
  const sub = host.querySelector('#pd-sub');
  let i = 0, breaths = 0, timer = null;
  const step = () => {
    if (breaths >= 3) {
      label.textContent = 'Go be where your feet are.';
      sub.textContent = 'Nothing in here needs you right now.';
      circle.style.transition = 'transform 2s ease';
      circle.style.transform = 'scale(0.75)';
      return;
    }
    const p = phases[i % phases.length];
    label.textContent = p.label;
    sub.textContent = `Breath ${breaths + 1} of 3`;
    circle.style.transition = `transform ${p.secs}s ease-in-out`;
    circle.style.transform = `scale(${p.scale})`;
    i++;
    if (i % phases.length === 0) breaths++;
    timer = setTimeout(step, p.secs * 1000);
  };
  circle.style.transform = 'scale(0.55)';
  timer = setTimeout(step, 600);
  host.querySelector('#pd-close').onclick = () => {
    clearTimeout(timer);
    host.classList.remove('open');
    host.innerHTML = '';
  };
}
