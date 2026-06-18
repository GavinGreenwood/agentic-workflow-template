import { Test, TestingModule } from "@nestjs/testing";
import { SeedService } from "./seed.service";
import { ObjectivesService } from "./objectives.service";
import { KeyResultsService } from "./key-results.service";
import { CheckInsService } from "./check-ins.service";
import { OkrStore } from "./okr.store";

const makeStore = () => new OkrStore();

describe("SeedService", () => {
  let module: TestingModule;
  let objectives: ObjectivesService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SeedService,
        ObjectivesService,
        KeyResultsService,
        CheckInsService,
        { provide: OkrStore, useFactory: makeStore },
      ],
    }).compile();
    objectives = module.get<ObjectivesService>(ObjectivesService);
  });

  afterEach(async () => {
    await module.close();
  });

  it("seeds three objectives on init", async () => {
    await module.init();
    expect(objectives.findAll()).toHaveLength(3);
  });
});
