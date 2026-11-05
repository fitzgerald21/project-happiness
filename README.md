# Project Happiness

A quiet daily companion for a settled mind. It's built on secular Buddhist ideas: no shoulds, noticing without judging, the middle way, and beginning again.

It's made to be used for a minute or two and then put down. There are no streaks, no notifications, and nothing to fall off of.

## What's inside

| Tab | What it's for |
|---|---|
| **Today** | A daily reminder card. A check-in (scattered ↔ settled, heavy ↔ light, one word). An intention picked from your happiness map. Logging moments of real presence with your family. Then *"I'm done here. Back to life."*: three breaths and a nudge to put the phone down. |
| **Sit** | A meditation timer with a soft synthesized bell. A breathing circle (Calm 4/6, Box, Physiological sigh). **Hard thing** mode for before a presentation: stress reframes plus 2 minutes of calming sighs. Keeps the screen awake while it runs. |
| **Pause** | For when you catch yourself reaching for the phone, YouTube, news, or another AI project. Name it, find what's underneath, ride the urge for 90 seconds with RAIN prompts, then pick something else or *choose it on purpose* with a time limit. You can also log one afterward without judgment. Shows patterns over 30 days. |
| **Experiments** | "Boxes with doors." Time-boxed experiments you choose yourself (No YouTube for 7 days, phone sleeps outside the bedroom…). Daily kept / partly / not today. Missing a day resets nothing. At the end you reflect, then keep going, keep a lighter version, or let it go. |
| **Reflect** | Insights (settledness line, minutes sat, simple "what seems to help" patterns), a nightly journal prompt, your happiness map, and your "why" (which also shows up when you pause on an urge). |

Settings has your name, the people you want to be present with, theme, bell, and JSON export/import.

## Hosting on GitHub Pages

There's no build step. It's plain HTML, CSS, and JavaScript modules.

1. Merge this into `main`.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute it's live at `https://<your-username>.github.io/project-happiness/`.
5. On your phone, open that URL. Then choose **Share → Add to Home Screen** (iPhone) or **⋮ → Install app** (Android). It runs full-screen and works offline.

To run it locally: `python3 -m http.server` in the repo folder, then open http://localhost:8000. ES modules don't load from `file://`.

> When you change files, bump `VERSION` in `sw.js` so phones pick up the new version quickly.

## Your data

Everything is stored in `localStorage` on the device you use. Nothing gets sent anywhere. Use **Settings → Export backup** now and then. Clearing your browser data, or using a different browser, starts you fresh.

## Adding Firebase later

The app is already set up for this. All reads and writes go through a small store (`js/store.js`) that hands state to an **adapter**:

```js
adapter.load()        // -> Promise<state | null>
adapter.save(state)   // persist
adapter.subscribe(cb) // optional: remote changes
```

`js/adapters/firebase.js` is a starting adapter. It keeps a local copy for offline use, signs in with Google, and mirrors the state to Firestore at `users/{uid}`. To turn it on:

1. Create a project at https://console.firebase.google.com and add a **Web app**.
2. Turn on **Authentication → Google**, and add `<your-username>.github.io` under **Authentication → Settings → Authorized domains**.
3. Create a **Firestore** database and use these rules so each person can only reach their own document:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
4. Paste your web config into `js/config.js` (replace `firebase: null`).
5. Open **Settings → Sign in with Google**. Your existing local data uploads on the first save after sign-in.

The Firebase config values aren't secrets. They're meant to be public, and the security rules above are what protect your data. The adapter hasn't been tested against a live Firebase project yet, so expect a small amount of tweaking the first time.

## Project layout

```
index.html              app shell + bottom tabs
css/styles.css          design tokens (light/dark), components
js/app.js               router, store setup, service worker registration
js/store.js             state shape, migrations, LocalAdapter
js/config.js            Firebase config (null = local only)
js/adapters/firebase.js optional cloud sync adapter
js/lib/                 content (all the words), dates, audio bell, charts, helpers
js/views/               today, sit, pause, experiments, reflect, settings
sw.js                   offline cache
manifest.webmanifest    home-screen app metadata
```

All of the app's words (reminders, journal prompts, experiment ideas, reframes) live in `js/lib/content.js`, so you can rewrite them in your own voice.
