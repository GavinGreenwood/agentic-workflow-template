import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthModule } from "./health/health.module";
import { OkrModule } from "./okr/okr.module";

@Module({
  imports: [HealthModule, OkrModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
