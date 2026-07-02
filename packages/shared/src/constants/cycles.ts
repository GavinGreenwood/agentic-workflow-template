/**
 * The fixed set of planning cycles an objective can belong to.
 *
 * Single source of truth for the cycle dropdown (web) — kept here so the
 * option list lives in one place rather than being duplicated in the UI.
 * The API schema deliberately stays a permissive string (`cycleId`), so this
 * list constrains the UI only; see the objectives form.
 */
export const CYCLES = [
  "2025-Q1",
  "2025-Q2",
  "2025-Q3",
  "2025-Q4",
  "2026-Q1",
  "2026-Q2",
  "2026-Q3",
  "2026-Q4",
] as const;

export type Cycle = (typeof CYCLES)[number];

/** Default cycle preselected in the form — matches the seeded objectives. */
export const DEFAULT_CYCLE: Cycle = "2026-Q2";
