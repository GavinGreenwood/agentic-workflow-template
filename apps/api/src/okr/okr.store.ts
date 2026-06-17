import { Injectable } from "@nestjs/common";
import type { Objective, KeyResult, CheckIn } from "@template/shared";

@Injectable()
export class OkrStore {
  readonly objectives = new Map<string, Objective>();
  readonly keyResults = new Map<string, KeyResult>();
  readonly checkIns = new Map<string, CheckIn>();
}
