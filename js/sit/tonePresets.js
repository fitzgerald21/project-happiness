// The ready-made setups for the two listening exercises, as they are in Come back.
const DUAL_F = ["iA", "nA", "iB", "nB", "bal", "spread", "what", "move", "depth", "rate"];
const HID_F = ["hInst", "hNote", "hRatio", "hDiff", "hShow", "hSide"];
const DUAL_PRESETS = {
    easy:       { name: "Easy", note: "Far apart in pitch, one in each ear. Headphones help.",
                  v: { iA: "pure", nA: 54, iB: "pure", nB: 73, bal: 1, spread: 0.7, what: "volume", move: "drift", depth: 0, rate: 0.1 } },
    medium:     { name: "Medium", note: "A fifth apart and more blended. Each swells and fades a little.",
                  v: { iA: "pure", nA: 54, iB: "pure", nB: 61, bal: 0.8, spread: 0.3, what: "volume", move: "drift", depth: 0.18, rate: 0.1 } },
    hard:       { name: "Hard", note: "Close together, the same sound, in the middle. The quieter one keeps slipping away. That's the practice.",
                  v: { iA: "pure", nA: 57, iB: "pure", nB: 62, bal: 0.5, spread: 0, what: "volume", move: "drift", depth: 0.5, rate: 0.1 } },
    sync:       { name: "Glide together", note: "Both sounds slide higher and lower together, keeping their distance.",
                  v: { iA: "pure", nA: 54, iB: "pure", nB: 61, bal: 0.9, spread: 0.4, what: "pitch", move: "sync", depth: 0.6, rate: 0.08 } },
    opposite:   { name: "Glide apart", note: "One slides up while the other slides down, then back. Keep hearing both.",
                  v: { iA: "pure", nA: 54, iB: "pure", nB: 61, bal: 0.9, spread: 0.4, what: "pitch", move: "opposite", depth: 0.6, rate: 0.08 } },
    flutecello: { name: "Flute and cello", note: "Two different instruments, a fifth apart. Easy to tell apart.",
                  v: { iA: "flute", nA: 57, iB: "cello", nB: 64, bal: 0.9, spread: 0.6, what: "volume", move: "drift", depth: 0.3, rate: 0.1 } },
    bowlvoice:  { name: "Bowl and voice", note: "Both warm and held, so they blend. It takes more listening.",
                  v: { iA: "bowl", nA: 52, iB: "voice", nB: 59, bal: 0.9, spread: 0.3, what: "volume", move: "drift", depth: 0.4, rate: 0.1 } },
    clarinetchoir: { name: "Clarinet and choir", note: "Gliding together, one reedy and one soft.",
                  v: { iA: "clarinet", nA: 50, iB: "choir", nB: 62, bal: 0.9, spread: 0.5, what: "pitch", move: "sync", depth: 0.35, rate: 0.07 } }
  };
const HID_PRESETS = {
    always: { name: "Always there", note: "A very faint tone sits inside the note the whole time. Keep hearing it, and tap when it slips away.",
              v: { hInst: "bowl", hNote: 52, hRatio: 3, hDiff: "medium", hShow: "always", hSide: "c" } },
    easy:   { name: "Challenge: easy", note: "The tone comes and goes. Tap when you hear it: a ding means you caught it, a wooden knock means it wasn't there.",
              v: { hInst: "bowl", hNote: 52, hRatio: 3, hDiff: "easy", hShow: "events", hSide: "c" } },
    medium: { name: "Challenge: medium", note: "Quieter, and gone for longer. Tap when you hear it.",
              v: { hInst: "bowl", hNote: 52, hRatio: 3, hDiff: "medium", hShow: "events", hSide: "c" } },
    hard:   { name: "Challenge: hard, in a voice", note: "A sung note with a much quieter tone inside it. Tap when you hear it.",
              v: { hInst: "voice", hNote: 52, hRatio: 3, hDiff: "hard", hShow: "events", hSide: "c" } },
    barely: { name: "Challenge: barely there", note: "As quiet as it gets. Expect to lose it.",
              v: { hInst: "bowl", hNote: 52, hRatio: 3, hDiff: "barely", hShow: "events", hSide: "c" } }
  };
export { DUAL_PRESETS, HID_PRESETS, DUAL_F, HID_F };
