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

    const json = await response.json();

    // Format: entweder direkt ein Array oder { version, items }
    if (Array.isArray(json)) {
      remoteItems = json;
    } else if (json.items && Array.isArray(json.items)) {
      remoteItems = json.items;
      if (json.version) remoteVersion = json.version;
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
    if (!item.name || typeof item.calories !== "number") {
      skipped++;
      continue;
    }

    const nameLower = item.name.toLowerCase();

    if (existingNames.has(nameLower)) {
      // Bereits vorhanden – niemals überschreiben
      skipped++;
    } else {
      // Neues Item – hinzufügen
      const newItem: FoodItem = {
        name: item.name,
        baseUnit: item.baseUnit ?? "100g",
        baseAmount: item.baseAmount ?? 100,
        calories: item.calories,
        protein: item.protein ?? 0,
        fat: item.fat ?? 0,
        carbs: item.carbs ?? 0,
        fiber: item.fiber ?? 0,
        ...(item.defaultAmount != null ? { defaultAmount: item.defaultAmount } : {}),
        ...(item.liquidMl != null ? { liquidMl: item.liquidMl } : {}),
        // Markierung: kam vom Server, nicht vom User angelegt
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

export function saveRemoteUrl(url: string): void {
  localStorage.setItem(REMOTE_URL_KEY, url);
}
