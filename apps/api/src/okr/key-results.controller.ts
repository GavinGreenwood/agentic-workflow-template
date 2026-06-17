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
import { CreateKeyResultSchema, UpdateKeyResultSchema } from "@template/shared";
import type {
  CreateKeyResultDto,
  UpdateKeyResultDto,
  KeyResult,
} from "@template/shared";
import { KeyResultsService } from "./key-results.service";

@Controller("key-results")
export class KeyResultsController {
  constructor(private readonly keyResultsService: KeyResultsService) {}

  @Get("by-objective/:objectiveId")
  findByObjective(@Param("objectiveId") objectiveId: string): KeyResult[] {
    return this.keyResultsService.findByObjective(objectiveId);
  }

  @Get(":id")
  findOne(@Param("id") id: string): KeyResult {
    return this.keyResultsService.findOne(id);
  }

  @Post()
  create(@Body() body: unknown): KeyResult {
    const dto: CreateKeyResultDto = CreateKeyResultSchema.parse(body);
    return this.keyResultsService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown): KeyResult {
    const dto: UpdateKeyResultDto = UpdateKeyResultSchema.parse(body);
    return this.keyResultsService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string): void {
    this.keyResultsService.remove(id);
  }
}
