import { z } from 'zod';

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type UpdateDepartment = z.infer<typeof updateDepartmentSchema>;
