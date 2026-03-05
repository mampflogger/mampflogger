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

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumericLiteral(normalizedTranscript: string): number | null {
  const thousandSeparated = normalizedTranscript.match(/\b\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?\b/);
  if (thousandSeparated) {
    const [integerRaw, fractionRaw] = thousandSeparated[0].split(",");
    const integer = integerRaw.replace(/[.\s]/g, "");
    const numeric = fractionRaw ? `${integer}.${fractionRaw}` : integer;
    const parsed = Number.parseFloat(numeric);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const directNumeric = normalizedTranscript.match(/\b\d+(?:[.,]\d+)?\b/);
  if (!directNumeric) return null;

  const token = directNumeric[0];
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

function parseGermanNumberWord(raw: string): number | null {
  const word = normalize(raw).replace(/\s+/g, "");
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

export function parseGermanSpokenNumber(transcript: string): number | null {
  const normalized = normalize(transcript);
  if (!normalized) return null;

  const numericLiteral = parseNumericLiteral(normalized);
  if (numericLiteral !== null) {
    return numericLiteral;
  }

  const tokens = normalized.split(" ").filter(Boolean);

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
