import { Module } from "@nestjs/common";
import { OkrStore } from "./okr.store";
import { ObjectivesService } from "./objectives.service";
import { KeyResultsService } from "./key-results.service";
import { CheckInsService } from "./check-ins.service";
import { SeedService } from "./seed.service";
import { ObjectivesController } from "./objectives.controller";
import { KeyResultsController } from "./key-results.controller";
import { CheckInsController } from "./check-ins.controller";

@Module({
  providers: [
    OkrStore,
    ObjectivesService,
    KeyResultsService,
    CheckInsService,
    SeedService,
  ],
  controllers: [ObjectivesController, KeyResultsController, CheckInsController],
})
export class OkrModule {}
