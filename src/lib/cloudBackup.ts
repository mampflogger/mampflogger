const BACKUP_EXACT_KEYS = new Set([
  "nutrition-log-entries",
  "nutrition-log-profile",
  "nutrition-log-activities",
]);

const BACKUP_PREFIXES = ["mampflogger-"];
const PENDING_MANUAL_RESTORE_SESSION_KEY = "mampflogger:pending-manual-cloud-restore";

type PendingManualRestore = {
  userId: string | null;
  snapshot: Record<string, unknown>;
};

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

export function collectManualBackupSnapshot(storage: Storage = localStorage): Record<string, string> {
  return collectCloudBackupSnapshot(storage);
}

export function queuePendingManualCloudRestoreSnapshot(snapshot: Record<string, unknown>, userId: string | null): void {
  const payload: PendingManualRestore = { userId, snapshot };
  sessionStorage.setItem(PENDING_MANUAL_RESTORE_SESSION_KEY, JSON.stringify(payload));
}

export function consumePendingManualCloudRestoreSnapshot(userId: string): Record<string, unknown> | null {
  const raw = sessionStorage.getItem(PENDING_MANUAL_RESTORE_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingManualRestore;
    if (parsed.userId && parsed.userId !== userId) return null;
    sessionStorage.removeItem(PENDING_MANUAL_RESTORE_SESSION_KEY);
    return parsed.snapshot && typeof parsed.snapshot === "object" ? parsed.snapshot : null;
  } catch {
    sessionStorage.removeItem(PENDING_MANUAL_RESTORE_SESSION_KEY);
    return null;
  }
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
    const nextValue = typeof value === "string" ? value : JSON.stringify(value);

    // Skip if values are identical
    if (currentValue === nextValue) {
      continue;
    }

    // Cloud always wins on restore — this prevents profile data loss
    storage.setItem(key, nextValue);
    restoredAny = true;
  }

  return restoredAny;
}

export function restoreManualBackupSnapshot(snapshot: Record<string, unknown>, storage: Storage = localStorage): number {
  let restoredCount = 0;

  for (const [key, value] of Object.entries(snapshot)) {
    if (!isCloudBackupKey(key)) continue;

    storage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    restoredCount += 1;
  }

  return restoredCount;
}