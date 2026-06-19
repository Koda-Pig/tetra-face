import { z } from "zod";

const INT32_MAX = 2147483647;

export const personalHighScoreSchema = z.object({
  score: z.number().int().min(0).max(INT32_MAX),
  createdAt: z.string().datetime(),
});

export const highScoreResponseSchema = z.object({
  highScore: personalHighScoreSchema.nullable(),
});

export const submitHighScoreRequestSchema = z.object({
  score: z.number().int().min(0).max(INT32_MAX),
});

export const submitHighScoreResponseSchema = highScoreResponseSchema.extend({
  achievedNewHighScore: z.boolean(),
});

export type PersonalHighScore = z.infer<typeof personalHighScoreSchema>;
export type HighScoreResponse = z.infer<typeof highScoreResponseSchema>;
export type SubmitHighScoreRequest = z.infer<
  typeof submitHighScoreRequestSchema
>;
export type SubmitHighScoreResponse = z.infer<
  typeof submitHighScoreResponseSchema
>;
