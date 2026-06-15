// Name-matching primitives for reconciling a submitted contact against the
// Eligible sheet. Pure functions — no I/O — so they're easy to unit test.

/** Normalize a name: strip punctuation, lowercase, collapse whitespace. */
export const normalizeName = (name) =>
  String(name)
    .replace(/[_\W]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/** Exact / substring / all-tokens match between a sheet name and an input. */
export const matchName = (sheetName, inputName) => {
  const a = normalizeName(sheetName);
  const b = normalizeName(inputName);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  return b.split(" ").every((token) => a.split(" ").includes(token));
};

/** Levenshtein edit distance between two strings. */
export const levenshteinDistance = (str1, str2) => {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i++) track[0][i] = i;
  for (let j = 0; j <= str2.length; j++) track[j][0] = j;
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return track[str2.length][str1.length];
};

/** Similarity in [0, 1] where 1 is an exact match. */
export const stringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  return 1.0 - levenshteinDistance(str1, str2) / maxLength;
};

/**
 * Find the row index of `contact` among `names` (column A of the Eligible tab,
 * including the header at index 0). Tries exact/substring/token matching first,
 * then a Levenshtein fuzzy fallback above `threshold`. Returns -1 if no match.
 * The header row (index 0) is never returned.
 */
export const findContactIndex = (names, contact, threshold) => {
  const exact = names.findIndex(
    (name, i) => i > 0 && matchName(name || "", contact)
  );
  if (exact !== -1) return exact;

  const input = normalizeName(contact);
  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 1; i < names.length; i++) {
    const score = stringSimilarity(input, normalizeName(names[i] || ""));
    if (score > threshold && score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
};

/** Convert a 0-based column index to an A1 column label (handles past Z: AA, AB…). */
export const columnLetter = (index) => {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
};
