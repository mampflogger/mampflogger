/**
 * Remote Food Database Sync
 *
 * Lädt beim App-Start eine versionierte Lebensmittelliste von einer externen URL
 * und mergt NUR neue Artikel in die lokale Datenbank.
 *
 * Regeln:
 * - User-eigene Einträge (isUserCreated = true) werden NIEMALS überschrieben
 * - Bereits vorhandene Artikel (gleicher Name, case-insensitive) werden NIEMALS überschrieben
 * - Es werden nur wirklich neue Artikel hinzugefügt
 * - Die zuletzt geladene Version wird gespeichert, um unnötige Fetches zu vermeiden
 */

import { FoodItem, foodDatabase, saveFoodDatabase } from "@/data/foodDatabase";

const SYNC_META_KEY = "mampflogger-remote-sync";
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 Stunden
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB limit
const MAX_ITEMS = 5000;
const MAX_STRING_LENGTH = 200;

/**
 * Validates that a remote URL is safe to fetch from.
 * Allows relative paths (e.g. /lebensmittelliste.json) and HTTPS URLs.
 * Blocks localhost, private IPs, and non-HTTPS protocols.
 */
function isValidRemoteUrl(url: string): boolean {
  // Allow relative paths (starts with /)
  if (url.startsWith("/") && !url.startsWith("//")) return true;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(hostname)) return false;
    if (hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) return false;
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    return true;
  } catch {
    return false;
  }
}

/** Sanitize a string field: trim and limit length */
function sanitizeString(value: unknown, maxLen = MAX_STRING_LENGTH): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

/** Sanitize a numeric field */
function sanitizeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !isFinite(value)) return fallback;
  return Math.max(0, value);
}

interface SyncMeta {
  lastFetched: number;   // Unix-Timestamp ms
  lastVersion: string;   // z.B. "2024-01-15"
  url: string;           // gespeicherte URL
}

function loadSyncMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSyncMeta(meta: SyncMeta): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

/**
 * Hauptfunktion: Lädt die Remote-Liste und mergt neue Artikel.
 *
 * @param remoteUrl  URL zur JSON-Datei (raw GitHub URL empfohlen)
 * @param force      true = immer laden, unabhängig vom Cache-Intervall
 * @returns Anzahl der neu hinzugefügten Artikel
 */
export async function syncRemoteFoodDatabase(
  remoteUrl: string,
  force = false
): Promise<{ added: number; skipped: number; error?: string }> {
  if (!remoteUrl) return { added: 0, skipped: 0 };

  // Validate URL before fetching
  if (!isValidRemoteUrl(remoteUrl)) {
    console.warn("[RemoteFoodSync] Ungültige URL blockiert:", remoteUrl);
    return { added: 0, skipped: 0, error: "Ungültige oder unsichere URL" };
  }

  // Cache-Check: Nicht öfter als alle 6h fetchen (außer force=true)
  if (!force) {
    const meta = loadSyncMeta();
    if (meta && meta.url === remoteUrl) {
      const age = Date.now() - meta.lastFetched;
      if (age < SYNC_INTERVAL_MS) {
        return { added: 0, skipped: 0 };
      }
    }
  }

  let remoteItems: FoodItem[];
  let remoteVersion = new Date().toISOString().slice(0, 10);

  try {
    const response = await fetch(remoteUrl, {
      cache: "no-cache",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Check response size to prevent memory exhaustion
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error("Response too large");
    }

    const text = await response.text();
    if (text.length > MAX_RESPONSE_SIZE) {
      throw new Error("Response too large");
    }

    const json = JSON.parse(text);

    // Format: entweder direkt ein Array oder { version, items }
    if (Array.isArray(json)) {
      remoteItems = json.slice(0, MAX_ITEMS);
    } else if (json.items && Array.isArray(json.items)) {
      remoteItems = json.items.slice(0, MAX_ITEMS);
      if (json.version) remoteVersion = String(json.version).slice(0, 50);
    } else {
      throw new Error("Unbekanntes JSON-Format");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[RemoteFoodSync] Fehler beim Laden:", msg);
    return { added: 0, skipped: 0, error: msg };
  }

  // Bestehende Namen als lowercase-Set für schnellen Lookup
  const existingNames = new Set(foodDatabase.map((f) => f.name.toLowerCase()));

  let added = 0;
  let skipped = 0;

  for (const item of remoteItems) {
    // Validierung: Pflichtfelder vorhanden?
    const name = sanitizeString(item.name);
    if (!name || typeof item.calories !== "number" || !isFinite(item.calories)) {
      skipped++;
      continue;
    }

    const nameLower = name.toLowerCase();

    if (existingNames.has(nameLower)) {
      skipped++;
    } else {
      const newItem: FoodItem = {
        name,
        baseUnit: sanitizeString(item.baseUnit, 20) || "100g",
        baseAmount: sanitizeNumber(item.baseAmount, 100),
        calories: sanitizeNumber(item.calories),
        protein: sanitizeNumber(item.protein),
        fat: sanitizeNumber(item.fat),
        carbs: sanitizeNumber(item.carbs),
        fiber: sanitizeNumber(item.fiber),
        ...(item.defaultAmount != null ? { defaultAmount: sanitizeNumber(item.defaultAmount) } : {}),
        ...(item.liquidMl != null ? { liquidMl: sanitizeNumber(item.liquidMl) } : {}),
        isRemote: true,
      };
      foodDatabase.push(newItem);
      existingNames.add(nameLower);
      added++;
    }
  }

  if (added > 0) {
    saveFoodDatabase(foodDatabase);
  }

  saveSyncMeta({ lastFetched: Date.now(), lastVersion: remoteVersion, url: remoteUrl });

  console.info(`[RemoteFoodSync] ✓ ${added} neue Artikel hinzugefügt, ${skipped} übersprungen (Version: ${remoteVersion})`);
  return { added, skipped };
}

/**
 * Gibt Sync-Metadaten zurück (für Anzeige im Settings-Dialog).
 */
export function getRemoteSyncMeta(): SyncMeta | null {
  return loadSyncMeta();
}

/**
 * Speichert/liest die Remote-URL aus localStorage.
 * Fallback: öffentliches GitHub-Repository
 */
const REMOTE_URL_KEY = "mampflogger-remote-url";
// Relativer Pfad: funktioniert automatisch in Preview UND Produktion
const DEFAULT_REMOTE_URL = "/lebensmittelliste.json";

export function loadRemoteUrl(): string {
  const stored = localStorage.getItem(REMOTE_URL_KEY);
  // Migrate: alte absolute URLs durch relativen Pfad ersetzen
  if (
    !stored ||
    stored.includes("raw.githubusercontent.com/mampflogger") ||
    stored.includes("mampflogger.lovable.app")
  ) {
    localStorage.setItem(REMOTE_URL_KEY, DEFAULT_REMOTE_URL);
    return DEFAULT_REMOTE_URL;
  }
  return stored;
}

export function saveRemoteUrl(url: string): boolean {
  if (!isValidRemoteUrl(url)) return false;
  localStorage.setItem(REMOTE_URL_KEY, url);
  return true;
}

export { isValidRemoteUrl };
