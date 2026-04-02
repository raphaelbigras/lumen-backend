import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateDepartment = z.infer<typeof createDepartmentSchema>;
