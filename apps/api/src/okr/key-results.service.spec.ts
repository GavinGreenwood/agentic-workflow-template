import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { KeyResultsService } from "./key-results.service";
import { OkrStore } from "./okr.store";

const makeStore = () => new OkrStore();

describe("KeyResultsService", () => {
  let service: KeyResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyResultsService,
        { provide: OkrStore, useFactory: makeStore },
      ],
    }).compile();
    service = module.get<KeyResultsService>(KeyResultsService);
  });

  it("creates a key result with currentValue equal to startValue", () => {
    const kr = service.create({
      objectiveId: "obj-1",
      title: "Grow ARR",
      unit: "currency",
      startValue: 50000,
      targetValue: 100000,
    });
    expect(kr.currentValue).toBe(50000);
    expect(kr.unit).toBe("currency");
  });

  it("findByObjective filters by objectiveId", () => {
    service.create({
      objectiveId: "obj-1",
      title: "A",
      unit: "number",
      startValue: 0,
      targetValue: 10,
    });
    service.create({
      objectiveId: "obj-2",
      title: "B",
      unit: "number",
      startValue: 0,
      targetValue: 10,
    });
    expect(service.findByObjective("obj-1")).toHaveLength(1);
    expect(service.findByObjective("obj-2")).toHaveLength(1);
  });

  it("findOne throws NotFoundException for unknown id", () => {
    expect(() => service.findOne("nope")).toThrow(NotFoundException);
  });

  it("update changes title", () => {
    const kr = service.create({
      objectiveId: "obj-1",
      title: "Old",
      unit: "percent",
      startValue: 0,
      targetValue: 100,
    });
    const updated = service.update(kr.id, { title: "New" });
    expect(updated.title).toBe("New");
  });

  it("updateCurrentValue changes currentValue", () => {
    const kr = service.create({
      objectiveId: "obj-1",
      title: "NPS",
      unit: "number",
      startValue: 0,
      targetValue: 50,
    });
    const updated = service.updateCurrentValue(kr.id, 30);
    expect(updated.currentValue).toBe(30);
  });

  it("remove deletes the key result", () => {
    const kr = service.create({
      objectiveId: "obj-1",
      title: "X",
      unit: "boolean",
      startValue: 0,
      targetValue: 1,
    });
    service.remove(kr.id);
    expect(() => service.findOne(kr.id)).toThrow(NotFoundException);
  });

  it("remove throws NotFoundException for unknown id", () => {
    expect(() => {
      service.remove("nope");
    }).toThrow(NotFoundException);
  });
});
