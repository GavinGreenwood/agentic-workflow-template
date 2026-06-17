export type ObjectiveStatus = "active" | "completed" | "archived";
export type KeyResultUnit = "number" | "percent" | "currency" | "boolean";

export interface Objective {
  id: string;
  title: string;
  description?: string;
  status: ObjectiveStatus;
  ownerId: string;
  cycleId: string;
  createdAt: string;
  updatedAt: string;
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  unit: KeyResultUnit;
  startValue: number;
  targetValue: number;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  keyResultId: string;
  value: number;
  note?: string;
  createdAt: string;
}

export interface ProgressSummary {
  objectiveId: string;
  title: string;
  status: ObjectiveStatus;
  progressPercent: number;
  keyResults: Array<{
    id: string;
    title: string;
    progressPercent: number;
    currentValue: number;
    targetValue: number;
    unit: KeyResultUnit;
  }>;
}
