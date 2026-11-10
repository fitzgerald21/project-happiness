// Opens the 3D book. The book is the One Line a Day app's own code with its own stylesheet, so while it is
// open the two stylesheets trade places and the rest of the app steps out of the way.
import { toast } from './util.js';

let host = null, links = null, hidden = [], book = null, opening = false;

function sheet(href) {
  return new Promise((resolve, reject) => {
    const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
    l.onload = () => resolve(l);
    l.onerror = reject;
    document.head.append(l);
  });
}

export async function openBook(ctx, key) {
  if (opening || (host && !host.hidden)) return;
  opening = true;
  const appCss = document.querySelector('link[href="css/app.css"]');
  try {
    toast('Opening the book…');
    const [{ mountBook }, a, b] = await Promise.all([
      import('../../book/shell.js'),
      links ? links[0] : sheet('book/css/styles.css'),
      links ? links[1] : sheet('book/css/shell.css'),
    ]);
    links = [a, b];
    links.forEach((l) => { l.disabled = false; });
    appCss.disabled = true;
    hidden = [...document.body.children].filter((el) => !el.hidden && !/^(SCRIPT|DIALOG)$/.test(el.tagName) && el !== host);
    hidden.forEach((el) => { el.hidden = true; });
    if (!host) { host = document.createElement('div'); host.id = 'app'; document.body.append(host); }
    host.hidden = false;
    window.scrollTo(0, 0);
    book = await mountBook(ctx.store, host, () => closeBook(ctx));
    book.show(key);
  } catch (e) {
    console.warn('Could not open the book', e);
    closeBook(ctx);
    toast("Couldn't open the 3D book just now. The page here works the same.");
  } finally { opening = false; }
}

function closeBook(ctx) {
  book?.hide();
  if (host) host.hidden = true;
  links?.forEach((l) => { l.disabled = true; });
  document.querySelector('link[href="css/app.css"]').disabled = false;
  document.querySelectorAll('.toasts').forEach((el) => { el.hidden = true; });
  hidden.forEach((el) => { el.hidden = false; });
  hidden = [];
  ctx.rerender();
}
