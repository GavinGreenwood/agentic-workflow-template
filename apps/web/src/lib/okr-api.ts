import type {
  Objective,
  KeyResult,
  CheckIn,
  ProgressSummary,
  CreateObjectiveDto,
  CreateKeyResultDto,
  CreateCheckInDto,
} from "@template/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} responded ${String(res.status)}`);
  }
  return res.json() as Promise<T>;
}

export function getObjectives(): Promise<Objective[]> {
  return apiFetch<Objective[]>("/objectives", { next: { revalidate: 30 } });
}

export function getObjective(id: string): Promise<Objective> {
  return apiFetch<Objective>(`/objectives/${id}`, {
    next: { revalidate: 30 },
  });
}

export function getObjectiveProgress(id: string): Promise<ProgressSummary> {
  return apiFetch<ProgressSummary>(`/objectives/${id}/progress`, {
    next: { revalidate: 30 },
  });
}

export function getKeyResultsByObjective(
  objectiveId: string,
): Promise<KeyResult[]> {
  return apiFetch<KeyResult[]>(`/key-results/by-objective/${objectiveId}`, {
    next: { revalidate: 30 },
  });
}

export function getCheckInsByKeyResult(
  keyResultId: string,
): Promise<CheckIn[]> {
  return apiFetch<CheckIn[]>(`/check-ins/by-key-result/${keyResultId}`, {
    next: { revalidate: 30 },
  });
}

export function createObjective(dto: CreateObjectiveDto): Promise<Objective> {
  return apiFetch<Objective>("/objectives", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function createKeyResult(dto: CreateKeyResultDto): Promise<KeyResult> {
  return apiFetch<KeyResult>("/key-results", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function createCheckIn(dto: CreateCheckInDto): Promise<CheckIn> {
  return apiFetch<CheckIn>("/check-ins", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
