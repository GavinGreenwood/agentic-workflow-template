import { Test, TestingModule } from "@nestjs/testing";
import { KeyResultsController } from "./key-results.controller";
import { KeyResultsService } from "./key-results.service";
import { OkrStore } from "./okr.store";

const makeStore = () => new OkrStore();

describe("KeyResultsController", () => {
  let controller: KeyResultsController;
  let service: KeyResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeyResultsController],
      providers: [
        KeyResultsService,
        { provide: OkrStore, useFactory: makeStore },
      ],
    }).compile();
    controller = module.get<KeyResultsController>(KeyResultsController);
    service = module.get<KeyResultsService>(KeyResultsService);
  });

  it("create validates and creates a key result", () => {
    const kr = controller.create({
      objectiveId: "obj-1",
      title: "Grow NPS",
      unit: "number",
      startValue: 20,
      targetValue: 60,
    });
    expect(kr.title).toBe("Grow NPS");
    expect(kr.currentValue).toBe(20);
  });

  it("findByObjective returns key results for an objective", () => {
    service.create({
      objectiveId: "obj-1",
      title: "KR1",
      unit: "percent",
      startValue: 0,
      targetValue: 100,
    });
    expect(controller.findByObjective("obj-1")).toHaveLength(1);
  });

  it("findOne returns the key result", () => {
    const kr = service.create({
      objectiveId: "obj-1",
      title: "KR",
      unit: "boolean",
      startValue: 0,
      targetValue: 1,
    });
    expect(controller.findOne(kr.id).id).toBe(kr.id);
  });

  it("update patches title", () => {
    const kr = service.create({
      objectiveId: "obj-1",
      title: "Old",
      unit: "number",
      startValue: 0,
      targetValue: 10,
    });
    const updated = controller.update(kr.id, { title: "New" });
    expect(updated.title).toBe("New");
  });

  it("remove deletes without error", () => {
    const kr = service.create({
      objectiveId: "obj-1",
      title: "KR",
      unit: "number",
      startValue: 0,
      targetValue: 10,
    });
    expect(() => {
      controller.remove(kr.id);
    }).not.toThrow();
  });

  it("throws ZodError for invalid create body", () => {
    expect(() => controller.create({ title: "" })).toThrow();
  });
});
