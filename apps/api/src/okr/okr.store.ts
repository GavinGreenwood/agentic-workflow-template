import { Injectable } from "@nestjs/common";
import type { Objective, KeyResult, CheckIn } from "@template/shared";

@Injectable()
export class OkrStore {
  readonly objectives: Map<string, Objective> = new Map();
  readonly keyResults: Map<string, KeyResult> = new Map();
  readonly checkIns: Map<string, CheckIn> = new Map();
}
