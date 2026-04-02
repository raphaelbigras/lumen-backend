import { z } from 'zod';

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'AGENT', 'USER']),
});

export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;
