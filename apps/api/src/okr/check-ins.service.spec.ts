import { Test, TestingModule } from "@nestjs/testing";
import { CheckInsService } from "./check-ins.service";
import { KeyResultsService } from "./key-results.service";
import { OkrStore } from "./okr.store";

const makeStore = () => new OkrStore();

describe("CheckInsService", () => {
  let checkInsService: CheckInsService;
  let keyResultsService: KeyResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckInsService,
        KeyResultsService,
        { provide: OkrStore, useFactory: makeStore },
      ],
    }).compile();
    checkInsService = module.get<CheckInsService>(CheckInsService);
    keyResultsService = module.get<KeyResultsService>(KeyResultsService);
  });

  it("creates a check-in and updates the key result current value", () => {
    const kr = keyResultsService.create({
      objectiveId: "obj-1",
      title: "Increase ARR",
      unit: "currency",
      startValue: 0,
      targetValue: 100000,
    });

    const checkIn = checkInsService.create({
      keyResultId: kr.id,
      value: 25000,
      note: "Q1 progress",
    });

    expect(checkIn.value).toBe(25000);
    expect(keyResultsService.findOne(kr.id).currentValue).toBe(25000);
  });

  it("findByKeyResult returns check-ins sorted newest first", () => {
    const kr = keyResultsService.create({
      objectiveId: "obj-1",
      title: "NPS",
      unit: "number",
      startValue: 0,
      targetValue: 50,
    });

    // Seed the store directly with deterministic timestamps so the sort is stable
    const store = (
      checkInsService as unknown as {
        store: {
          checkIns: Map<
            string,
            {
              id: string;
              keyResultId: string;
              value: number;
              createdAt: string;
            }
          >;
        };
      }
    ).store;
    store.checkIns.set("ci-1", {
      id: "ci-1",
      keyResultId: kr.id,
      value: 10,
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    store.checkIns.set("ci-2", {
      id: "ci-2",
      keyResultId: kr.id,
      value: 20,
      createdAt: "2025-01-02T00:00:00.000Z",
    });

    const results = checkInsService.findByKeyResult(kr.id);
    expect(results).toHaveLength(2);
    expect(results.at(0)?.value).toBe(20);
  });
});
