const SMALL_NUMBERS: Record<string, number> = {
  null: 0,
  eins: 1,
  ein: 1,
  eine: 1,
  einen: 1,
  einem: 1,
  erster: 1,
  erste: 1,
  erstes: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  fuenf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
  elf: 11,
  zwoelf: 12,
  dreizehn: 13,
  vierzehn: 14,
  fuenfzehn: 15,
  sechzehn: 16,
  siebzehn: 17,
  achtzehn: 18,
  neunzehn: 19,
};

const TENS: Record<string, number> = {
  zwanzig: 20,
  dreissig: 30,
  vierzig: 40,
  fuenfzig: 50,
  sechzig: 60,
  siebzig: 70,
  achtzig: 80,
  neunzig: 90,
};

const DEFERRED_SINGLE_NUMBER_WORDS = new Set([
  "ein",
  "eins",
  "eine",
  "einen",
  "einem",
  "zwei",
  "drei",
  "vier",
  "fuenf",
  "sechs",
  "sieben",
  "acht",
  "neun",
]);

const SCALE_WORD_RE = /\b(?:hundert|tausend)\b/;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // English / mis-recognized scale words → German
    .replace(/\bhundred\b/g, "hundert")
    .replace(/\bhunderd\b/g, "hundert")
    .replace(/\bhundart\b/g, "hundert")
    .replace(/\bhundat\b/g, "hundert")
    .replace(/\bhundet\b/g, "hundert")
    .replace(/\bthousand\b/g, "tausend")
    .replace(/\btousend\b/g, "tausend")
    .replace(/\btausand\b/g, "tausend")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumericLiteral(normalizedTranscript: string): number | null {
  const scaledMatch = normalizedTranscript.match(/\b(\d+(?:[.,]\d+)?)\s*(tausend|hundert)\b/);
  if (scaledMatch) {
    const base = Number.parseFloat(scaledMatch[1].replace(",", "."));
    if (Number.isFinite(base)) {
      return scaledMatch[2] === "tausend" ? base * 1000 : base * 100;
    }
  }

  const thousandSeparatedMatches = [...normalizedTranscript.matchAll(/\b\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?\b/g)];
  if (thousandSeparatedMatches.length > 0) {
    const token = thousandSeparatedMatches[thousandSeparatedMatches.length - 1][0];
    const [integerRaw, fractionRaw] = token.split(",");
    const integer = integerRaw.replace(/[.\s]/g, "");
    const numeric = fractionRaw ? `${integer}.${fractionRaw}` : integer;
    const parsed = Number.parseFloat(numeric);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const directNumericMatches = [...normalizedTranscript.matchAll(/\b\d+(?:[.,]\d+)?\b/g)];
  if (directNumericMatches.length === 0) return null;

  const token = directNumericMatches[directNumericMatches.length - 1][0];
  if (/^\d{1,3}(?:\.\d{3})+$/.test(token)) {
    const parsed = Number.parseInt(token.replace(/\./g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number.parseFloat(token.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseUnderHundred(word: string): number | null {
  if (word in SMALL_NUMBERS) return SMALL_NUMBERS[word];
  if (word in TENS) return TENS[word];

  for (const [tenWord, tenValue] of Object.entries(TENS)) {
    if (!word.endsWith(tenWord)) continue;

    const prefix = word.slice(0, -tenWord.length);
    if (!prefix) return tenValue;

    const unitPart = prefix.endsWith("und") ? prefix.slice(0, -3) : prefix;
    const unitValue = SMALL_NUMBERS[unitPart];
    if (unitValue && unitValue < 10) {
      return tenValue + unitValue;
    }
  }

  return null;
}

function parseUnderThousand(word: string): number | null {
  if (word.includes("hundert")) {
    const [hundredsRaw, restRaw = ""] = word.split("hundert", 2);
    const hundreds = hundredsRaw ? parseUnderHundred(hundredsRaw) : 1;
    if (hundreds === null) return null;

    if (!restRaw) return hundreds * 100;
    const rest = parseUnderHundred(restRaw);
    if (rest === null) return null;
    return hundreds * 100 + rest;
  }

  return parseUnderHundred(word);
}

function normalizeNumberWord(raw: string): string {
  return normalize(raw)
    .replace(/\s+/g, "")
    // English / mis-recognized variants of "hundert"
    .replace(/hundred/g, "hundert")
    .replace(/hunderd/g, "hundert")
    .replace(/hundart/g, "hundert")
    .replace(/hundat/g, "hundert")
    .replace(/hundet/g, "hundert")
    .replace(/hundrd/g, "hundert")
    .replace(/hunder(?!t)/g, "hundert")
    // English / mis-recognized variants of "tausend"
    .replace(/thousand/g, "tausend")
    .replace(/tousend/g, "tausend")
    .replace(/tausen(?!d)/g, "tausend")
    .replace(/tausnd/g, "tausend")
    .replace(/tausent/g, "tausend")
    .replace(/tausand/g, "tausend");
}

function parseGermanNumberWord(raw: string): number | null {
  const word = normalizeNumberWord(raw);
  if (!word) return null;

  if (word.includes("tausend")) {
    const [thousandsRaw, restRaw = ""] = word.split("tausend", 2);
    const thousands = thousandsRaw ? parseUnderThousand(thousandsRaw) : 1;
    if (thousands === null) return null;

    if (!restRaw) return thousands * 1000;
    const rest = parseUnderThousand(restRaw);
    if (rest === null) return null;
    return thousands * 1000 + rest;
  }

  return parseUnderThousand(word);
}

const DIGIT_WORDS: Record<string, string> = {
  null: "0",
  eins: "1", ein: "1", eine: "1", einen: "1", einem: "1",
  zwei: "2", drei: "3", vier: "4", fuenf: "5", sechs: "6",
  sieben: "7", acht: "8", neun: "9",
};

/**
 * Parse a sequence of single-digit words/digits, e.g. "eins null null" → 100,
 * "eins eins vier komma neun" → 114.9. Requires at least 2 digits to avoid
 * ambiguity with normal speech ("ein Brötchen" must NOT become 1 here).
 */
function parseDigitSequence(normalized: string): number | null {
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length < 2) return null;

  let out = "";
  let digitCount = 0;
  let sawSeparator = false;
  for (const tk of tokens) {
    if (DIGIT_WORDS[tk]) {
      out += DIGIT_WORDS[tk];
      digitCount += 1;
    } else if (/^[0-9]$/.test(tk)) {
      out += tk;
      digitCount += 1;
    } else if (tk === "komma" || tk === "punkt") {
      if (out.includes(".") || !out) return null;
      out += ".";
      sawSeparator = true;
    } else {
      // Non-digit token before any digits: ignore as filler ("nimm", "und")
      if (digitCount === 0 && !sawSeparator) continue;
      // Otherwise: stop sequence
      break;
    }
  }

  if (digitCount < 2) return null;
  const parsed = Number.parseFloat(out);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseGermanSpokenNumber(transcript: string): number | null {
  const normalized = normalize(transcript);
  if (!normalized) return null;

  const numericLiteral = parseNumericLiteral(normalized);
  if (numericLiteral !== null) {
    return numericLiteral;
  }

  // Digit-by-digit sequence ("eins null null" → 100). Run before word parser
  // so it wins over a stray match of just "ein" → 1.
  const digitSeq = parseDigitSequence(normalized);
  if (digitSeq !== null) return digitSeq;

  const tokens = normalized.split(" ").filter(Boolean);

  // Decimal: "X komma Y" → split & combine (X word-number, Y digit-by-digit or word).
  const kommaIdx = tokens.indexOf("komma");
  if (kommaIdx > 0 && kommaIdx < tokens.length - 1) {
    const intStr = tokens.slice(0, kommaIdx).join(" ");
    const fracTokens = tokens.slice(kommaIdx + 1);
    const intPart = parseGermanSpokenNumber(intStr);
    if (intPart !== null) {
      // Try digit-sequence fraction first
      let fracStr = "";
      for (const tk of fracTokens) {
        if (DIGIT_WORDS[tk]) fracStr += DIGIT_WORDS[tk];
        else if (/^[0-9]+$/.test(tk)) fracStr += tk;
        else break;
      }
      if (!fracStr) {
        const fracNum = parseGermanSpokenNumber(fracTokens.join(" "));
        if (fracNum !== null && fracNum >= 0) fracStr = String(Math.trunc(fracNum));
      }
      if (fracStr) {
        const combined = Number.parseFloat(`${intPart}.${fracStr}`);
        if (Number.isFinite(combined)) return combined;
      }
    }
  }

  // Try longest token windows first (e.g. "fuenf tausend schritte" -> "fuenftausend")
  for (let size = tokens.length; size >= 1; size -= 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      const candidate = tokens.slice(start, start + size).join("");
      const parsed = parseGermanNumberWord(candidate);
      if (parsed !== null) return parsed;
    }
  }

  return null;
}

export function shouldDeferGermanSpokenNumber(transcript: string, parsedNumber: number): boolean {
  if (!Number.isInteger(parsedNumber) || parsedNumber < 1 || parsedNumber > 9) return false;

  const normalized = normalize(transcript);
  if (!normalized || SCALE_WORD_RE.test(normalized)) return false;

  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length !== 1) return false;

  return DEFERRED_SINGLE_NUMBER_WORDS.has(tokens[0]) || /^[1-9]$/.test(tokens[0]);
}

export function mergeGermanSpokenNumberTranscript(previousBuffer: string, nextChunk: string): string {
  const previous = previousBuffer.trim();
  const next = nextChunk.trim();

  if (!previous) return next;
  if (!next) return previous;

  const previousNormalized = normalize(previous);
  const nextNormalized = normalize(next);

  if (!previousNormalized) return next;
  if (!nextNormalized) return previous;
  if (previousNormalized === nextNormalized) return next.length >= previous.length ? next : previous;
  if (nextNormalized.includes(previousNormalized)) return next;
  if (previousNormalized.includes(nextNormalized)) return previous;

  const previousParsed = parseGermanSpokenNumber(previousNormalized);
  const nextParsed = parseGermanSpokenNumber(nextNormalized);
  const combined = `${previous} ${next}`.trim();
  const combinedParsed = parseGermanSpokenNumber(combined);

  if (
    combinedParsed !== null &&
    combinedParsed > 0 &&
    (SCALE_WORD_RE.test(nextNormalized) ||
      (previousParsed !== null && combinedParsed !== previousParsed) ||
      (nextParsed !== null && combinedParsed !== nextParsed))
  ) {
    return combined;
  }

  if (nextParsed !== null && previousParsed !== null && nextParsed > previousParsed) {
    return next;
  }

  return next;
}
