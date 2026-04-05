const BACKUP_EXACT_KEYS = new Set([
  "nutrition-log-entries",
  "nutrition-log-profile",
  "nutrition-log-activities",
]);

const BACKUP_PREFIXES = ["mampflogger-"];

const LEGACY_RANDOM_DEFAULT_SUPPLEMENT_NAMES = new Set([
  "Vitamin D3",
  "Omega-3 Fischöl",
  "Magnesium",
  "Vitamin C",
  "Zink",
  "Vitamin B12",
  "Eisen",
  "Vitamin K2",
  "Calcium",
  "Multivitamin Komplex",
]);

export function isCloudBackupKey(key: string | null): key is string {
  if (!key) return false;
  return BACKUP_EXACT_KEYS.has(key) || BACKUP_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function collectCloudBackupSnapshot(storage: Storage = localStorage): Record<string, string> {
  const snapshot: Record<string, string> = {};

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!isCloudBackupKey(key)) continue;
    snapshot[key] = storage.getItem(key) ?? "";
  }

  return snapshot;
}

function isLegacyRandomSupplementSeed(rawValue: string | null): boolean {
  if (!rawValue) return false;

  try {
    const parsed = JSON.parse(rawValue);
    return (
      Array.isArray(parsed) &&
      parsed.length === LEGACY_RANDOM_DEFAULT_SUPPLEMENT_NAMES.size &&
      parsed.every((item) => LEGACY_RANDOM_DEFAULT_SUPPLEMENT_NAMES.has(item?.name))
    );
  } catch {
    return false;
  }
}

export function restoreCloudBackupSnapshot(snapshot: Record<string, unknown>, storage: Storage = localStorage): boolean {
  let restoredAny = false;

  for (const [key, value] of Object.entries(snapshot)) {
    if (!isCloudBackupKey(key)) continue;

    const currentValue = storage.getItem(key);
    const shouldReplaceLegacySupplements =
      key === "mampflogger-supplements" && isLegacyRandomSupplementSeed(currentValue);

    if (currentValue !== null && currentValue !== "" && !shouldReplaceLegacySupplements) {
      continue;
    }

    storage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    restoredAny = true;
  }

  return restoredAny;
}