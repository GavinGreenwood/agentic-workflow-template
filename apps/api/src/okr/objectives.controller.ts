import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { CreateObjectiveSchema, UpdateObjectiveSchema } from "@template/shared";
import type {
  CreateObjectiveDto,
  UpdateObjectiveDto,
  Objective,
} from "@template/shared";
import { ObjectivesService } from "./objectives.service";
import { KeyResultsService } from "./key-results.service";
import type { ProgressSummary } from "@template/shared";

@Controller("objectives")
export class ObjectivesController {
  constructor(
    private readonly objectivesService: ObjectivesService,
    private readonly keyResultsService: KeyResultsService,
  ) {}

  @Get()
  findAll(): Objective[] {
    return this.objectivesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string): Objective {
    return this.objectivesService.findOne(id);
  }

  @Get(":id/progress")
  getProgress(@Param("id") id: string): ProgressSummary {
    const objective = this.objectivesService.findOne(id);
    const keyResults = this.keyResultsService.findByObjective(id);

    const krSummaries = keyResults.map((kr) => {
      const range = kr.targetValue - kr.startValue;
      const progress =
        range === 0 ? 100 : ((kr.currentValue - kr.startValue) / range) * 100;
      return {
        id: kr.id,
        title: kr.title,
        progressPercent: Math.min(100, Math.max(0, Math.round(progress))),
        currentValue: kr.currentValue,
        targetValue: kr.targetValue,
        unit: kr.unit,
      };
    });

    const progressPercent =
      krSummaries.length === 0
        ? 0
        : Math.round(
            krSummaries.reduce((sum, kr) => sum + kr.progressPercent, 0) /
              krSummaries.length,
          );

    return {
      objectiveId: objective.id,
      title: objective.title,
      status: objective.status,
      progressPercent,
      keyResults: krSummaries,
    };
  }

  @Post()
  create(@Body() body: unknown): Objective {
    const dto: CreateObjectiveDto = CreateObjectiveSchema.parse(body);
    return this.objectivesService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown): Objective {
    const dto: UpdateObjectiveDto = UpdateObjectiveSchema.parse(body);
    return this.objectivesService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string): void {
    this.objectivesService.remove(id);
  }
}
