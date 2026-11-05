// Firebase adapter: a starting point for cloud sync.
// It is only loaded when config.firebase is set (see js/config.js and the README).
//
// It keeps a local copy in localStorage (so the app works offline and opens
// instantly) and mirrors the whole state to Firestore at users/{uid}.
// Sign-in uses Google. Add your GitHub Pages domain under
// Firebase Console -> Authentication -> Settings -> Authorized domains.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { LocalAdapter } from '../store.js';

export class FirebaseAdapter {
  constructor(firebaseConfig) {
    this.local = new LocalAdapter();
    this.app = initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.user = null;
    this.saveTimer = null;
    this.ready = new Promise((resolve) => {
      onAuthStateChanged(this.auth, (user) => {
        this.user = user;
        resolve();
      });
    });
  }

  get signedIn() { return !!this.user; }
  signIn() { return signInWithPopup(this.auth, new GoogleAuthProvider()); }
  signOut() { return signOut(this.auth); }
  ref() { return doc(this.db, 'users', this.user.uid); }

  async load() {
    const local = await this.local.load();
    await this.ready;
    if (!this.user) return local;
    try {
      const snap = await getDoc(this.ref());
      const remote = snap.exists() ? snap.data().state : null;
      if (!remote) return local;
      if (!local) return remote;
      return (remote.updatedAt || 0) >= (local.updatedAt || 0) ? remote : local;
    } catch (e) {
      console.warn('Firestore load failed, using local copy', e);
      return local;
    }
  }

  save(state) {
    this.local.save(state);
    if (!this.user) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      setDoc(this.ref(), { state }).catch((e) => console.warn('Firestore save failed', e));
    }, 800);
  }

  subscribe(cb) {
    let unsub = () => {};
    this.ready.then(() => {
      if (this.user) unsub = onSnapshot(this.ref(), (snap) => snap.exists() && cb(snap.data().state));
    });
    return () => unsub();
  }
}
