import type { PdfPlanData } from './pdf';

const KEY = 'sprinklersmart_pending_plan';

export function savePendingPlan(data: PdfPlanData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded or storage blocked — silent; on-return check will find nothing
  }
}

export function loadPendingPlan(): PdfPlanData | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PdfPlanData) : null;
  } catch {
    return null;
  }
}

export function clearPendingPlan(): void {
  try {
    localStorage.removeItem(KEY);
  } catch { /* noop */ }
}
