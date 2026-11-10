# Project Happiness

One quiet place for the whole practice: sit, come back, notice the pull, be there for the people you love, and write one line a day.

It started as four separate apps. This is all of them as one:

| It came from | What it brought | Where it lives now |
|---|---|---|
| **Project Happiness** (v1) | Check-ins, intentions, present moments, the urge pause, experiments, your why | Today, Pause, Path |
| **Come back** | Tap-to-return counting, remote buttons, the eleven scenes and their sounds, the two listening exercises, reminders, distraction tags, the sit timeline | The sit player |
| **Lantern** (TMI) | The ten stages, guided sits with a recorded voice, drills, walking, loving-kindness, the six preparation steps | The sit player, Path |
| **One Line a Day** | The five-year page, and the 3D book itself with dictation and summarizing | Today, Book |

## How it fits together

Everything lands on one day.

- **Today** is the day's thread under a sky that follows the real clock. Arrive (mind, heart, one word), set an intention, sit, tap who you were really there with, mark your experiments, write the line. Each part folds to a single line once it's done. In the evening the line comes forward.
- **Sit** is one player for every kind of sitting. A guided stage sit, a drill, walking, loving-kindness, breathing with the circle, or just sitting. Whatever the practice, a tap anywhere means "I noticed, and came back." Rest on the guide figure that shows the technique, any of the scenes, or a black screen with one number. Sound can be the scene, two held voices, a hidden overtone, or silence.
- **Pause** (the round button) is for the moment you catch yourself reaching. Name it, find what's underneath, ride it for 90 seconds, then choose. One of the choices is to sit for three minutes, which opens the same player.
- **Path** is the long view: the ten stages with your current one marked, experiments ("boxes with doors"), and the compass (your why, what makes you happy, who you want to be there for).
- **Book** is the one-line-a-day page for any date, a door into the full 3D book (**Open the book**), every line you've kept, and a look back that reads across all of it: does sitting, being present, or writing line up with a more settled mind?

## Your data

The app is local-first. It works signed out, and opens instantly from a copy in this browser.

Sign in with Google (Settings) and it syncs through the **come-back-fitz21** Firebase project, using the places the other apps already use:

```
users/{uid}/sessions/{start}        every sit, in Come back's format     (shared with Come back)
users/{uid}/entries/{YYYY-MM-DD}    one line per day                     (shared with One Line a Day)
users/{uid}                         Come back's settings: reminders, distraction list and remote buttons, shared both ways
users/{uid}/settings/app            the book's cover, handwriting and layout     (shared with One Line a Day)
users/{uid}/settings/ph             this app's profile, preferences, experiments
users/{uid}/settings/ph-log-YYYY    this app's day notes: check-ins, presence, pauses (one document a year)
```

So a sit done here shows up in Come back, and a line written here is in the One Line a Day book, and the other way round. Nothing was moved and the other apps keep working. No Firestore rules change is needed: the two new documents sit under `settings/`, which the shared rules already allow for the owner account.

The first time it opens in a browser it also picks up what the older apps left in that browser's storage (they're served from the same site): the first Project Happiness's data and Lantern's sits and stage, which never synced anywhere.

## Running it

There's no build step. It's plain HTML, CSS and JavaScript modules.

```
python3 -m http.server      # then open http://localhost:8000
```

To publish: GitHub Pages, **Deploy from a branch**, `main`, `/ (root)`. On a phone, open the URL and **Add to Home Screen**. Bump `VERSION` in `sw.js` when you ship changes so phones pick them up.

## Layout

```
index.html, css/app.css     the shell and the design
js/app.js                   router
js/config.js                Firebase config
js/data/store.js            the one data layer: in-memory state, local cache, cloud mirror
js/data/cloud.js            Firestore reads, writes and listeners
js/views/                   today, sit, pause, path, book, settings
js/lib/                     day.js (a day gathered from everything), page.js (the book page), sky.js, charts, dates, content (all the words)
js/sit/player.js            the sit: script, scene, sound, returns
js/sit/prep.js, review.js   before and after
js/sit/script.js, figure.js Lantern's guided-sit builder and the guide figure
js/sit/scenes.js, ambient.js  Come back's scenes and their synthesized sounds
js/sit/audio.js, voice.js   bells, the shared audio engine, recorded guidance
js/content/                 the ten stages, hindrances, glossary
js/sit/remote.js            remote and earbud buttons: which press means what
book/                       the One Line a Day book (its own code and stylesheet); book/shell.js connects it to the store
vendor/                     Come back's instrument engine and recordings for the listening exercises
voice/, sounds/, previews/  recorded guidance, scene recordings, scene thumbnails
```

## Not carried over

- Lantern's four interactive explainers (attention and awareness, moments of consciousness, the mind system, the obstacle map).
- Come back's saved sound setups, colour themes, and picking a sit back up after the phone unloads the page.
- One Line a Day's photo import still opens in that app, and deleting the whole book can only be done there.

The stages follow *The Mind Illuminated* by Culadasa, Matthew Immergut and Jeremy Graves, paraphrased as a study companion.
