import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ObjectivesController } from "./objectives.controller";
import { ObjectivesService } from "./objectives.service";
import { KeyResultsService } from "./key-results.service";
import { OkrStore } from "./okr.store";

const makeStore = () => new OkrStore();

describe("ObjectivesController", () => {
  let controller: ObjectivesController;
  let objectivesService: ObjectivesService;
  let keyResultsService: KeyResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObjectivesController],
      providers: [
        ObjectivesService,
        KeyResultsService,
        { provide: OkrStore, useFactory: makeStore },
      ],
    }).compile();
    controller = module.get<ObjectivesController>(ObjectivesController);
    objectivesService = module.get<ObjectivesService>(ObjectivesService);
    keyResultsService = module.get<KeyResultsService>(KeyResultsService);
  });

  it("findAll returns empty array initially", () => {
    expect(controller.findAll()).toEqual([]);
  });

  it("create validates and creates an objective", () => {
    const obj = controller.create({
      title: "Test objective",
      ownerId: "user-1",
      cycleId: "2025-Q1",
    });
    expect(obj.title).toBe("Test objective");
  });

  it("create throws ZodError for invalid body", () => {
    expect(() => controller.create({ title: "" })).toThrow();
  });

  it("findOne returns the objective", () => {
    const obj = objectivesService.create({
      title: "O",
      ownerId: "u",
      cycleId: "q",
    });
    expect(controller.findOne(obj.id).id).toBe(obj.id);
  });

  it("update patches the objective", () => {
    const obj = objectivesService.create({
      title: "O",
      ownerId: "u",
      cycleId: "q",
    });
    const updated = controller.update(obj.id, { status: "completed" });
    expect(updated.status).toBe("completed");
  });

  it("remove deletes without returning content", () => {
    const obj = objectivesService.create({
      title: "O",
      ownerId: "u",
      cycleId: "q",
    });
    expect(() => {
      controller.remove(obj.id);
    }).not.toThrow();
    expect(() => objectivesService.findOne(obj.id)).toThrow(NotFoundException);
  });

  describe("getProgress", () => {
    it("returns 0% progress when no key results", () => {
      const obj = objectivesService.create({
        title: "O",
        ownerId: "u",
        cycleId: "q",
      });
      const progress = controller.getProgress(obj.id);
      expect(progress.progressPercent).toBe(0);
      expect(progress.keyResults).toHaveLength(0);
    });

    it("computes progress from key results", () => {
      const obj = objectivesService.create({
        title: "O",
        ownerId: "u",
        cycleId: "q",
      });
      const kr = keyResultsService.create({
        objectiveId: obj.id,
        title: "KR",
        unit: "percent",
        startValue: 0,
        targetValue: 100,
      });
      keyResultsService.updateCurrentValue(kr.id, 50);
      const progress = controller.getProgress(obj.id);
      expect(progress.progressPercent).toBe(50);
    });

    it("clamps progress to 0-100", () => {
      const obj = objectivesService.create({
        title: "O",
        ownerId: "u",
        cycleId: "q",
      });
      const kr = keyResultsService.create({
        objectiveId: obj.id,
        title: "KR",
        unit: "number",
        startValue: 0,
        targetValue: 10,
      });
      keyResultsService.updateCurrentValue(kr.id, 15);
      const progress = controller.getProgress(obj.id);
      expect(progress.keyResults.at(0)?.progressPercent).toBe(100);
    });

    it("handles zero-range key result (start === target)", () => {
      const obj = objectivesService.create({
        title: "O",
        ownerId: "u",
        cycleId: "q",
      });
      keyResultsService.create({
        objectiveId: obj.id,
        title: "Boolean KR",
        unit: "boolean",
        startValue: 0,
        targetValue: 0,
      });
      const progress = controller.getProgress(obj.id);
      expect(progress.keyResults.at(0)?.progressPercent).toBe(100);
    });
  });
});
