import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { CreateCheckInSchema } from "@template/shared";
import type { CreateCheckInDto, CheckIn } from "@template/shared";
import { CheckInsService } from "./check-ins.service";

@Controller("check-ins")
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Get("by-key-result/:keyResultId")
  findByKeyResult(@Param("keyResultId") keyResultId: string): CheckIn[] {
    return this.checkInsService.findByKeyResult(keyResultId);
  }

  @Post()
  create(@Body() body: unknown): CheckIn {
    const dto: CreateCheckInDto = CreateCheckInSchema.parse(body);
    return this.checkInsService.create(dto);
  }
}
