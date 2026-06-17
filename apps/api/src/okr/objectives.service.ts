import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Objective } from "@template/shared";
import type { CreateObjectiveDto, UpdateObjectiveDto } from "@template/shared";
import { OkrStore } from "./okr.store";

@Injectable()
export class ObjectivesService {
  constructor(private readonly store: OkrStore) {}

  findAll(): Objective[] {
    return Array.from(this.store.objectives.values());
  }

  findOne(id: string): Objective {
    const obj = this.store.objectives.get(id);
    if (!obj) throw new NotFoundException(`Objective ${id} not found`);
    return obj;
  }

  create(dto: CreateObjectiveDto): Objective {
    const now = new Date().toISOString();
    const objective: Objective = {
      id: randomUUID(),
      title: dto.title,
      description: dto.description,
      status: "active",
      ownerId: dto.ownerId,
      cycleId: dto.cycleId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.objectives.set(objective.id, objective);
    return objective;
  }

  update(id: string, dto: UpdateObjectiveDto): Objective {
    const existing = this.findOne(id);
    const updated: Objective = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.store.objectives.set(id, updated);
    return updated;
  }

  remove(id: string): void {
    this.findOne(id);
    this.store.objectives.delete(id);
  }
}
