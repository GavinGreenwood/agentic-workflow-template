import { z } from "zod";

export const CreateObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  ownerId: z.string().min(1),
  cycleId: z.string().min(1),
});

export const UpdateObjectiveSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export const CreateKeyResultSchema = z.object({
  objectiveId: z.string().min(1),
  title: z.string().min(1).max(200),
  unit: z.enum(["number", "percent", "currency", "boolean"]),
  startValue: z.number(),
  targetValue: z.number(),
});

export const UpdateKeyResultSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  targetValue: z.number().optional(),
});

export const CreateCheckInSchema = z.object({
  keyResultId: z.string().min(1),
  value: z.number(),
  note: z.string().max(500).optional(),
});

export type CreateObjectiveDto = z.infer<typeof CreateObjectiveSchema>;
export type UpdateObjectiveDto = z.infer<typeof UpdateObjectiveSchema>;
export type CreateKeyResultDto = z.infer<typeof CreateKeyResultSchema>;
export type UpdateKeyResultDto = z.infer<typeof UpdateKeyResultSchema>;
export type CreateCheckInDto = z.infer<typeof CreateCheckInSchema>;
