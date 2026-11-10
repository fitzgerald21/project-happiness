// All the words in the app live here, so they're easy to change.
// The reminders are written as ideas, not as quotes. Nothing here is a "should".

export const WISDOM = [
  { title: 'No shoulds', body: "There's nothing you're supposed to be. There's what's happening right now, and what you do next. That's all." },
  { title: 'The two arrows', body: "In an old Buddhist teaching, pain is the first arrow. The story we tell about the pain is the second arrow, and we fire that one at ourselves. You can't always stop the first. You can set the second one down." },
  { title: 'The middle way', body: "A lute string wound too tight snaps. One left too loose makes no sound. Practice works the same way. Not a strict box, not total drift. Tuned just right." },
  { title: 'Noticing is the practice', body: "Every time you notice your mind has wandered and you come back, that's one rep. Wandering isn't failing. It's how the training works." },
  { title: 'Urges are waves', body: "An urge rises, peaks, and passes, every time. You don't have to fight it or obey it. You can watch it the way you'd watch a wave come in." },
  { title: 'Weather, not climate', body: "This feeling, good or bad, is weather. It's real, and it will change. Nothing in the mind stays put for long." },
  { title: 'Attention is the scarce thing', body: "Unused AI credits aren't wasted. Unused attention isn't wasted either. You're saving it for your life." },
  { title: 'Be where your feet are', body: "Your wife, your baby, this room, this breath. Life is only ever happening here. The feed is always somewhere else." },
  { title: 'Ordinary is enough', body: "Feeding the baby, washing a cup, walking to the car. Most happiness lives in ordinary moments that you're actually there for." },
  { title: 'Wanting', body: "A lot of suffering is wanting things to be different from how they are. Notice the wanting. You don't have to do what it says." },
  { title: 'You are not your thoughts', body: "Thoughts show up like messages. Some are useful, a lot are noise. You can read them without believing all of them." },
  { title: 'Stress is energy', body: "A racing heart before a hard thing is your body getting ready. It's fuel. You don't have to feel calm to do something well." },
  { title: 'Begin again', body: "You can start over any time you like. Not on Monday, not tomorrow. Now. Falling off doesn't break anything. Starting again is the practice." },
  { title: 'Come and see', body: "Secular practice doesn't ask you to believe anything. Try it, look closely, and keep whatever actually helps." },
  { title: 'Attention is love', body: "The best thing you can give the people you love isn't more time. It's your attention during the time you already have." },
  { title: 'Friendliness', body: "Talk to yourself the way you'd talk to a good friend who's having a hard week. Harshness has never made anyone more present." },
  { title: 'Equanimity', body: "A good day doesn't need clinging to, and a bad one doesn't need pushing away. Both pass through. You can stay steady while they do." },
  { title: "Beginner's mind", body: "Today you get to do this for the first time. Drop the scorecard of past attempts. What's actually here right now?" },
  { title: 'Using your own mind', body: "Struggling with a problem using only your own head isn't inefficient. It's how a mind gets strong. Let some things be slow and yours." },
  { title: 'Enough', body: "You don't need to optimize your way to peace. Peace is mostly what's left when you stop reaching for the next thing." },
];

export const JOURNAL_PROMPTS = [
  'What was one moment today when you were really there?',
  'What pulled your attention away today? What was underneath it?',
  'What would today have looked like with 20% less screen?',
  'What are you carrying that you could set down, even for tonight?',
  "Where was the second arrow today, the story you added on top of what happened?",
  'What did your wife or your baby do today that you want to remember?',
  'What felt hard today? What did you do anyway?',
  'If your mind were weather right now, what would it be?',
  'What did you reach for today when you were uncomfortable?',
  'What gave you energy today? What drained it?',
  'What would you tell a friend who had the day you had?',
  'What are three small things you are grateful for right now?',
  'What did you do today with your own brain, without any help?',
  'What is one thing worrying you? What part of it can you actually control?',
  'When did you feel most like yourself today?',
  "What's one thing you could let be good enough?",
  'What does "settled" feel like in your body? When did you last feel it?',
  'What are you looking forward to?',
  'What would make tomorrow 1% calmer?',
  'What did you notice today that you usually miss?',
];

export const DEFAULT_HAPPINESS = [
  'Time fully with my wife',
  'Playing with my baby',
  'Meditating',
  'Walking outside without my phone',
  'Reading a real book',
  'Moving my body',
  'Making something with my hands',
  'A good night of sleep',
  'Cooking a meal',
];

export const DEFAULT_WHY =
  "I want to feel settled instead of scattered. To be present with my wife and my baby. To be steady enough to handle work and hard presentations. To use my own mind again. To feel at peace, and full.";

export const REACHING_FOR = [
  { id: 'scroll', label: 'Phone scrolling' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'news', label: 'News' },
  { id: 'ai', label: 'AI / building stuff' },
  { id: 'work', label: 'Email / Slack' },
  { id: 'other', label: 'Something else' },
];

export const UNDERNEATH = [
  { id: 'bored', label: 'Bored' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'avoiding', label: 'Avoiding something hard' },
  { id: 'tired', label: 'Tired' },
  { id: 'restless', label: 'Restless' },
  { id: 'lonely', label: 'Lonely' },
  { id: 'fomo', label: 'Fear of missing out' },
  { id: 'autopilot', label: 'Autopilot / habit' },
];

export const RAIN = [
  { k: 'Recognize', t: 'Something is pulling at you. Just name it: "There\'s an urge."' },
  { k: 'Allow', t: "It's okay that it's here. You don't have to fix it or follow it." },
  { k: 'Investigate', t: 'Where do you feel it in your body? Chest, hands, jaw? Is it changing?' },
  { k: 'Nurture', t: 'What do you actually need right now? Rest, connection, a break, a breath?' },
];

export const EXPERIMENT_TEMPLATES = [
  'No YouTube',
  'No news (one weekly check at most)',
  'Phone sleeps outside the bedroom',
  'No phone for the first hour of the day',
  'AI only for work, none for personal projects',
  "Phone in a drawer from dinner to baby's bedtime",
  'Screens off after 9pm',
  'Sit every day, any length counts',
  'Distracting apps deleted from my phone',
];

export const REFRAMES = [
  { h: 'This is energy', b: 'The racing heart and the buzzing are your body getting ready. Studies on stress show it helps to read those feelings as fuel instead of danger.' },
  { h: "You don't have to feel calm", b: "People do hard things while nervous all the time. Calm is optional. Showing up is enough." },
  { h: 'They want you to do well', b: "The people in the room aren't grading your nerves. Mostly they're hoping to learn something and get to their next meeting." },
  { h: 'Be useful, not perfect', b: 'Your job is to help them understand one or two things. You only have to be clear, not impressive.' },
  { h: 'Set down the second arrow', b: "The hard thing is the first arrow. All the \"what if I blow it\" stories are the second. You don't have to fire that one." },
  { h: 'It will pass', b: 'In a few hours or days, this will be something that happened. Impermanence works in your favor here.' },
];

export const BREATH_PATTERNS = {
  calm: { name: 'Calm', desc: 'In 4, out 6. Slows everything down.', phases: [
    { label: 'Breathe in', secs: 4, scale: 1 },
    { label: 'Breathe out', secs: 6, scale: 0.55 },
  ] },
  box: { name: 'Box', desc: 'In, hold, out, hold. 4 counts each. Steadying.', phases: [
    { label: 'Breathe in', secs: 4, scale: 1 },
    { label: 'Hold', secs: 4, scale: 1 },
    { label: 'Breathe out', secs: 4, scale: 0.55 },
    { label: 'Hold', secs: 4, scale: 0.55 },
  ] },
  sigh: { name: 'Sigh', desc: 'Two inhales, then a long exhale. Fastest way to settle nerves.', phases: [
    { label: 'Breathe in', secs: 2, scale: 0.85 },
    { label: 'Sip more air', secs: 1, scale: 1 },
    { label: 'Long breath out', secs: 6, scale: 0.55 },
  ] },
};

// What tends to help with what's underneath an urge. Several of these are the classic hindrances wearing
// everyday clothes; the same ones show up on the cushion.
export const UNDERNEATH_HELP = {
  bored: { name: 'Wanting', help: "Boredom is wanting something more interesting than this. Notice the wanting itself. It passes, and a settled mind is a better pleasure than the feed." },
  anxious: { name: 'Worry', help: 'Calm the body first. Let the out-breath get a little longer. Decide when you will deal with the thing, then let it wait until then.' },
  avoiding: { name: 'Aversion', help: "There's something you don't want to feel. Meet it with patience. Five minutes on the hard thing usually shrinks it." },
  tired: { name: 'Low energy', help: "Scrolling doesn't rest you. Stand up, drink some water, look out a window, or actually lie down for ten minutes." },
  restless: { name: 'Restlessness', help: 'The body wants to move. Let it: walk, stretch, shake it out. Then see what is left of the urge.' },
  lonely: { name: 'Wanting connection', help: 'A screen is a thin version of what you want. Text someone real, or go and sit next to someone you love.' },
  fomo: { name: 'Doubt', help: "The feed will be there later, and almost none of it will matter by then. What's here is the part you can actually miss." },
  autopilot: { name: 'Habit', help: "Nothing is wrong. The hand just moved by itself. You caught it, and that's the whole skill." },
};

// What to call the parts of the day.
export function partOfDay(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? 'night' : h < 11 ? 'morning' : h < 17 ? 'day' : h < 21 ? 'evening' : 'night';
}
