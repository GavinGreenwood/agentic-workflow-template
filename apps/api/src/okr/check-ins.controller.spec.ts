import { Test, TestingModule } from "@nestjs/testing";
import { CheckInsController } from "./check-ins.controller";
import { CheckInsService } from "./check-ins.service";
import { KeyResultsService } from "./key-results.service";
import { OkrStore } from "./okr.store";

const makeStore = () => new OkrStore();

describe("CheckInsController", () => {
  let controller: CheckInsController;
  let keyResultsService: KeyResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckInsController],
      providers: [
        CheckInsService,
        KeyResultsService,
        { provide: OkrStore, useFactory: makeStore },
      ],
    }).compile();
    controller = module.get<CheckInsController>(CheckInsController);
    keyResultsService = module.get<KeyResultsService>(KeyResultsService);
  });

  it("creates a check-in with valid body", () => {
    const kr = keyResultsService.create({
      objectiveId: "obj-1",
      title: "Revenue",
      unit: "currency",
      startValue: 0,
      targetValue: 100000,
    });
    const checkIn = controller.create({ keyResultId: kr.id, value: 10000 });
    expect(checkIn.value).toBe(10000);
  });

  it("findByKeyResult returns check-ins for a key result", () => {
    const kr = keyResultsService.create({
      objectiveId: "obj-1",
      title: "Revenue",
      unit: "currency",
      startValue: 0,
      targetValue: 100000,
    });
    controller.create({ keyResultId: kr.id, value: 5000 });
    const results = controller.findByKeyResult(kr.id);
    expect(results).toHaveLength(1);
    expect(results.at(0)?.value).toBe(5000);
  });

  it("throws ZodError for invalid body", () => {
    expect(() => controller.create({})).toThrow();
  });
});
