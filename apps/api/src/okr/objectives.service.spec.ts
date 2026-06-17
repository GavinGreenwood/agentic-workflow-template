import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ObjectivesService } from "./objectives.service";
import { OkrStore } from "./okr.store";

const makeStore = () => new OkrStore();

describe("ObjectivesService", () => {
  let service: ObjectivesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectivesService,
        { provide: OkrStore, useFactory: makeStore },
      ],
    }).compile();
    service = module.get<ObjectivesService>(ObjectivesService);
  });

  it("creates an objective and returns it", () => {
    const obj = service.create({
      title: "Grow revenue",
      ownerId: "user-1",
      cycleId: "2025-Q1",
    });
    expect(obj.id).toBeDefined();
    expect(obj.title).toBe("Grow revenue");
    expect(obj.status).toBe("active");
  });

  it("findAll returns all objectives", () => {
    service.create({ title: "O1", ownerId: "u1", cycleId: "q1" });
    service.create({ title: "O2", ownerId: "u1", cycleId: "q1" });
    expect(service.findAll()).toHaveLength(2);
  });

  it("findOne throws NotFoundException for unknown id", () => {
    expect(() => service.findOne("nope")).toThrow(NotFoundException);
  });

  it("update changes status", () => {
    const obj = service.create({ title: "O", ownerId: "u", cycleId: "q" });
    const updated = service.update(obj.id, { status: "completed" });
    expect(updated.status).toBe("completed");
  });

  it("remove deletes the objective", () => {
    const obj = service.create({ title: "O", ownerId: "u", cycleId: "q" });
    service.remove(obj.id);
    expect(service.findAll()).toHaveLength(0);
  });

  it("remove throws NotFoundException for unknown id", () => {
    expect(() => service.remove("nope")).toThrow(NotFoundException);
  });
});
