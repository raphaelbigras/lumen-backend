import { z } from 'zod';

export const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export type UpdateTicket = z.infer<typeof updateTicketSchema>;
