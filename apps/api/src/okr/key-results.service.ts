import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { KeyResult } from "@template/shared";
import type { CreateKeyResultDto, UpdateKeyResultDto } from "@template/shared";
import { OkrStore } from "./okr.store";

@Injectable()
export class KeyResultsService {
  constructor(private readonly store: OkrStore) {}

  findByObjective(objectiveId: string): KeyResult[] {
    return Array.from(this.store.keyResults.values()).filter(
      (kr) => kr.objectiveId === objectiveId,
    );
  }

  findOne(id: string): KeyResult {
    const kr = this.store.keyResults.get(id);
    if (!kr) throw new NotFoundException(`KeyResult ${id} not found`);
    return kr;
  }

  create(dto: CreateKeyResultDto): KeyResult {
    const now = new Date().toISOString();
    const keyResult: KeyResult = {
      id: randomUUID(),
      objectiveId: dto.objectiveId,
      title: dto.title,
      unit: dto.unit,
      startValue: dto.startValue,
      targetValue: dto.targetValue,
      currentValue: dto.startValue,
      createdAt: now,
      updatedAt: now,
    };
    this.store.keyResults.set(keyResult.id, keyResult);
    return keyResult;
  }

  update(id: string, dto: UpdateKeyResultDto): KeyResult {
    const existing = this.findOne(id);
    const updated: KeyResult = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.store.keyResults.set(id, updated);
    return updated;
  }

  updateCurrentValue(id: string, value: number): KeyResult {
    const existing = this.findOne(id);
    const updated: KeyResult = {
      ...existing,
      currentValue: value,
      updatedAt: new Date().toISOString(),
    };
    this.store.keyResults.set(id, updated);
    return updated;
  }

  remove(id: string): void {
    this.findOne(id);
    this.store.keyResults.delete(id);
  }
}
