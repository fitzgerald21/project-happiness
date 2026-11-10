function normalizeLine(text) {
  return text.trim().replace(/\s+/g, " ");
}
function lineKey(text) {
  const s = normalizeLine(text);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
export {
  lineKey,
  normalizeLine
};
