const DEFAULT_SELECTION_KEYWORDS = [
  "nummer",
  "nr",
  "position",
  "zeige",
  "nimm",
  "nehme",
  "rezept",
  "eintrag",
  "dropdown",
  "option",
  "optionen",
  "liste",
  "auswahl",
  "hilfsmittel",
  "kochmütze",
  "kochmuetze",
  "zutat",
  "zutaten",
  "kategorie",
];

const NUMBER_WORDS: Record<string, number> = {
  eins: 1,
  ein: 1,
  erste: 1,
  erster: 1,
  erstes: 1,
  ersten: 1,
  zwei: 2,
  zweite: 2,
  zweiter: 2,
  zweites: 2,
  zweiten: 2,
  drei: 3,
  dritte: 3,
  dritter: 3,
  drittes: 3,
  dritten: 3,
  vier: 4,
  vierte: 4,
  vierter: 4,
  viertes: 4,
  vierten: 4,
  fünf: 5,
  fuenf: 5,
  fünfte: 5,
  fuenfte: 5,
  sechs: 6,
  sechste: 6,
  sieben: 7,
  siebte: 7,
  acht: 8,
  achte: 8,
  neun: 9,
  neunte: 9,
  zehn: 10,
  zehnte: 10,
  elf: 11,
  elfte: 11,
  zwölf: 12,
  zwoelf: 12,
  zwölfte: 12,
  zwoelfte: 12,
  dreizehn: 13,
  vierzehn: 14,
  fünfzehn: 15,
  fuenfzehn: 15,
  sechzehn: 16,
  siebzehn: 17,
  achtzehn: 18,
  neunzehn: 19,
  zwanzig: 20,
  einundzwanzig: 21,
  zweiundzwanzig: 22,
  dreiundzwanzig: 23,
  vierundzwanzig: 24,
  fünfundzwanzig: 25,
  fuenfundzwanzig: 25,
};

function normalizeToken(token: string) {
  return token
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function parseNumberToken(token?: string | null): number | null {
  if (!token) return null;

  const normalized = normalizeToken(token);
  if (/^\d{1,3}$/.test(normalized)) {
    return parseInt(normalized, 10);
  }

  return NUMBER_WORDS[normalized] ?? null;
}

interface ParseSpokenSelectionIndexOptions {
  allowBareNumber?: boolean;
  max?: number;
  keywords?: string[];
}

export function parseSpokenSelectionIndex(
  transcript: string,
  options: ParseSpokenSelectionIndexOptions = {},
): number | null {
  const { allowBareNumber = false, max, keywords = DEFAULT_SELECTION_KEYWORDS } = options;
  const tokens = (transcript.toLowerCase().match(/[a-zA-ZäöüÄÖÜß0-9]+/g) ?? []).map(normalizeToken);

  if (tokens.length === 0) return null;

  const normalizedKeywords = keywords.map(normalizeToken);

  for (let i = 0; i < tokens.length; i += 1) {
    if (!normalizedKeywords.includes(tokens[i])) continue;

    const candidate = tokens[i + 1] === "nummer" || tokens[i + 1] === "position"
      ? tokens[i + 2]
      : tokens[i + 1];
    const parsed = parseNumberToken(candidate);

    if (parsed !== null) {
      if (max !== undefined && parsed > max) return null;
      return parsed - 1;
    }
  }

  if (!allowBareNumber || tokens.length > 2) return null;

  for (const token of tokens) {
    const parsed = parseNumberToken(token);
    if (parsed !== null) {
      if (max !== undefined && parsed > max) return null;
      return parsed - 1;
    }
  }

  return null;
}
