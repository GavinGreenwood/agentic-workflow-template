import { Test, TestingModule } from "@nestjs/testing";
import { SeedService } from "./seed.service";
import { ObjectivesService } from "./objectives.service";
import { KeyResultsService } from "./key-results.service";
import { CheckInsService } from "./check-ins.service";
import { OkrStore } from "./okr.store";

const makeStore = () => new OkrStore();

describe("SeedService", () => {
  let service: SeedService;
  let objectives: ObjectivesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        ObjectivesService,
        KeyResultsService,
        CheckInsService,
        { provide: OkrStore, useFactory: makeStore },
      ],
    }).compile();
    service = module.get<SeedService>(SeedService);
    objectives = module.get<ObjectivesService>(ObjectivesService);
  });

  it("seeds three objectives on init", () => {
    service.onModuleInit();
    expect(objectives.findAll()).toHaveLength(3);
  });
});
