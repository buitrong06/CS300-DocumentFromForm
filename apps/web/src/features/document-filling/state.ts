export type DraftSaveState = "loading" | "saved" | "unsaved" | "saving" | "error" | "conflict";

export function hasUnsavedDraftEdits(
  localValues: Record<string, string>,
  persistedValues: Record<string, string>,
): boolean {
  const localKeys = Object.keys(localValues);
  const persistedKeys = Object.keys(persistedValues);
  if (localKeys.length !== persistedKeys.length) return true;
  return localKeys.some((key) => localValues[key] !== persistedValues[key]);
}

export function canExportPersistedDraft(
  state: DraftSaveState,
  localValues: Record<string, string>,
  persistedValues: Record<string, string>,
): boolean {
  return state === "saved" && !hasUnsavedDraftEdits(localValues, persistedValues);
}

/** Network, server and rate-limit failures are transient; other 4xx need the filler. */
export function isRetryableSaveStatus(status: number | null): boolean {
  return status === null || status === 408 || status === 429 || status >= 500;
}

export function saveRetryDelayMs(failedAttempts: number): number {
  return Math.min(30_000, 2_000 * 2 ** Math.max(0, failedAttempts - 1));
}

/** Editors may emit change events while mounting; only a different value is an edit. */
export function isRealEdit(
  values: Record<string, string>,
  fieldKey: string,
  next: string,
): boolean {
  return (values[fieldKey] ?? "") !== next;
}
