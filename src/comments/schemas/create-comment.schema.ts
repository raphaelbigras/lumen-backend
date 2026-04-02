import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.string().min(1),
});

export type CreateComment = z.infer<typeof createCommentSchema>;
