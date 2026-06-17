import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { CheckIn } from "@template/shared";
import type { CreateCheckInDto } from "@template/shared";
import { OkrStore } from "./okr.store";
import { KeyResultsService } from "./key-results.service";

@Injectable()
export class CheckInsService {
  constructor(
    private readonly store: OkrStore,
    private readonly keyResultsService: KeyResultsService,
  ) {}

  findByKeyResult(keyResultId: string): CheckIn[] {
    return Array.from(this.store.checkIns.values())
      .filter((c) => c.keyResultId === keyResultId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  create(dto: CreateCheckInDto): CheckIn {
    const checkIn: CheckIn = {
      id: randomUUID(),
      keyResultId: dto.keyResultId,
      value: dto.value,
      note: dto.note,
      createdAt: new Date().toISOString(),
    };
    this.store.checkIns.set(checkIn.id, checkIn);
    this.keyResultsService.updateCurrentValue(dto.keyResultId, dto.value);
    return checkIn;
  }
}
