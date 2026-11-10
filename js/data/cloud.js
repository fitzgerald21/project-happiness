// Cloud sync: Firebase Auth (Google) + Firestore, in the project the other apps already use.
// Nothing here invents a new place for data that already has one:
//
//   users/{uid}/sessions/{start}     { rec: JSON }   every sit, in Come back's format (so its history is this history)
//   users/{uid}/entries/{YYYY-MM-DD} { text, ... }   one line a day, in One Line a Day's format (the same book)
//   users/{uid}                      { data: {...} } Come back's settings; we read reminders and distractions, and keep its total in step
//   users/{uid}/settings/ph          this app's own profile, preferences and experiments
//   users/{uid}/settings/ph-log-YYYY this app's day notes (check-ins, presence, pauses), one document a year
//
// The last two sit under settings/, which the shared rules already allow, so no rules change is needed.
// Firestore's persistent cache queues writes made offline and replays them on reconnect.
const V = '11.0.2';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export async function createCloud(config) {
  const [appM, authM, fs] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);
  const app = appM.initializeApp(config);
  const auth = authM.getAuth(app);
  let db;
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch {
    db = fs.getFirestore(app);
  }
  let uid = null;
  let unsubs = [];
  const stop = () => { unsubs.forEach((u) => u()); unsubs = []; };
  const userDoc = () => fs.doc(db, 'users', uid);
  const own = (name) => fs.doc(db, 'users', uid, 'settings', name);
  const sessionDoc = (start) => fs.doc(db, 'users', uid, 'sessions', String(start));
  const entryDoc = (day) => fs.doc(db, 'users', uid, 'entries', day);

  return {
    user: () => (auth.currentUser ? { id: auth.currentUser.uid, email: auth.currentUser.email, name: auth.currentUser.displayName } : null),
    onUser(cb) {
      authM.getRedirectResult(auth).catch(() => {});
      return authM.onAuthStateChanged(auth, (u) => { stop(); uid = u?.uid || null; cb(u ? { id: u.uid, email: u.email, name: u.displayName } : null); });
    },
    async signIn() {
      const provider = new authM.GoogleAuthProvider();
      try {
        await authM.signInWithPopup(auth, provider);
      } catch (err) {
        // Popups are blocked in some in-app browsers and home-screen apps: fall back to a redirect.
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(err.code)) return authM.signInWithRedirect(auth, provider);
        if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') throw err;
      }
    },
    async signOut() { stop(); await authM.signOut(auth); },

    // ---- one-off reads, used when this device first meets the account ----
    async getOwn(name) { const s = await fs.getDoc(own(name)); return s.exists() ? s.data() : null; },

    // ---- live listeners ----
    watchOwn(name, cb, onErr) {
      unsubs.push(fs.onSnapshot(own(name), (s) => cb(s.exists() ? s.data() : null), onErr));
    },
    watchSessions(cb, onErr) {
      unsubs.push(fs.onSnapshot(fs.collection(db, 'users', uid, 'sessions'), (snap) => {
        if (snap.empty && snap.metadata.fromCache) return;   // nothing cached yet: wait for the server before believing it
        const out = [];
        snap.forEach((d) => { try { const r = JSON.parse(d.data().rec); if (r && typeof r.start === 'number') out.push(r); } catch { /* not a sit we understand */ } });
        cb(out);
      }, onErr));
    },
    watchEntries(cb, onErr) {
      unsubs.push(fs.onSnapshot(fs.collection(db, 'users', uid, 'entries'), (snap) => {
        if (snap.empty && snap.metadata.fromCache) return;
        const out = {};
        snap.forEach((d) => { const x = d.data(); if (x.text) out[d.id] = { t: x.text, ...(x.original ? { r: x.original } : {}), u: x.updatedAt || 0 }; });
        cb(out);
      }, onErr));
    },
    watchComeBack(cb, onErr) {
      unsubs.push(fs.onSnapshot(userDoc(), (s) => cb((s.exists() && s.data().data) || {}), onErr));
    },

    // ---- writes (each returns a promise that settles when the server has it; the UI doesn't wait) ----
    patchOwn(name, patch) { return fs.setDoc(own(name), patch, { merge: true }); },
    putSession(rec) { return fs.setDoc(sessionDoc(rec.start), { rec: JSON.stringify(rec) }); },
    deleteSession(start) { return fs.deleteDoc(sessionDoc(start)); },
    putEntry(day, e) {
      if (!e || !e.t) return fs.deleteDoc(entryDoc(day));
      const [year, month, d] = day.split('-').map(Number);
      return fs.setDoc(entryDoc(day), { text: e.t, ...(e.r ? { original: e.r } : {}), updatedAt: e.u || Date.now(), year, month, day: d });
    },
    // Come back keeps a running count of returns in its settings document; keep it true when sits are saved here.
    setComeBack(key, value) { return fs.setDoc(userDoc(), { data: { [key]: value }, updated: Date.now() }, { merge: true }); },
    setComeBackTotal(n) { return fs.setDoc(userDoc(), { data: { total: String(n) } }, { merge: true }); },
  };
}
