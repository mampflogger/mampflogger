/**
 * Lightweight fuzzy string matching for voice input tolerance.
 *
 * Uses a combination of:
 * 1. Normalized substring matching (current behaviour)
 * 2. Trigram similarity (good for typos / speech-recognition drift)
 * 3. Levenshtein distance for short strings
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const set = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
}

/**
 * Score how well `query` matches `target`. Higher = better match.
 * Returns 0 if no reasonable match.
 */
export function fuzzyScore(query: string, target: string): number {
  const nq = normalize(query);
  const nt = normalize(target);

  if (!nq || !nt) return 0;

  // Exact substring → highest score (but only if lengths are comparable)
  if (nt.includes(nq) && nq.length / nt.length >= 0.5) return 1.0;
  if (nq.includes(nt) && nt.length / nq.length >= 0.5) return 0.95;

  // Word-level: check if any query word is a substring of target
  const qWords = nq.split(" ");
  const tWords = nt.split(" ");
  let wordHits = 0;
  for (const qw of qWords) {
    if (qw.length < 2) continue;
    for (const tw of tWords) {
      // Require reasonable overlap: short query words must nearly match the target word
      const minLen = Math.min(qw.length, tw.length);
      const maxLen = Math.max(qw.length, tw.length);
      if ((tw.includes(qw) || qw.includes(tw)) && minLen / maxLen >= 0.6) {
        wordHits++;
        break;
      }
    }
  }
  // Require that at least half of query words AND target words are covered
  if (wordHits > 0 && qWords.length > 0 && wordHits / Math.max(qWords.length, tWords.length) >= 0.5) {
    const wordScore = 0.7 + 0.2 * (wordHits / qWords.length);
    return wordScore;
  }

  // Trigram similarity
  const tSim = trigramSimilarity(nq, nt);

  // For short strings, also consider Levenshtein
  if (nq.length <= 12 && nt.length <= 20) {
    const maxLen = Math.max(nq.length, nt.length);
    const dist = levenshtein(nq, nt);
    const levScore = 1 - dist / maxLen;
    // Use the better of the two scores
    const best = Math.max(tSim, levScore);
    return best >= 0.45 ? best : 0;
  }

  // For longer strings, also try word-level Levenshtein
  for (const qw of qWords) {
    if (qw.length < 3) continue;
    for (const tw of tWords) {
      if (tw.length < 3) continue;
      const maxLen = Math.max(qw.length, tw.length);
      const dist = levenshtein(qw, tw);
      const score = 1 - dist / maxLen;
      if (score >= 0.6) return 0.5 + score * 0.3;
    }
  }

  return tSim >= 0.35 ? tSim : 0;
}

/**
 * Find the best fuzzy match from a list of candidates.
 * Returns the index and score, or -1 if nothing passes threshold.
 */
export function bestFuzzyMatch(
  query: string,
  candidates: string[],
  threshold = 0.4,
): { index: number; score: number } {
  let bestIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < candidates.length; i++) {
    const score = fuzzyScore(query, candidates[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestScore >= threshold ? { index: bestIdx, score: bestScore } : { index: -1, score: 0 };
}

/**
 * Search a list of candidates and return all that pass a minimum threshold,
 * sorted by score descending.
 */
export function fuzzyFilter<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  threshold = 0.35,
): FuzzyResult<T>[] {
  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    const score = fuzzyScore(query, getText(item));
    if (score >= threshold) {
      results.push({ item, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
