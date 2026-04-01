import { z } from 'zod';

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type UpdateCategory = z.infer<typeof updateCategorySchema>;
