import { z } from 'zod';

const SITES = ['Valleyfield', 'Beauharnois', 'Montréal', 'Brossard', 'Bromont', 'Hemmingford'] as const;

export const createTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  departmentId: z.string().min(1),
  categoryId: z.string().uuid(),
  site: z.enum(SITES),
});

export type CreateTicket = z.infer<typeof createTicketSchema>;
