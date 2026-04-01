import { z } from 'zod';

export const assignTicketSchema = z.object({
  agentId: z.string().min(1),
});

export type AssignTicket = z.infer<typeof assignTicketSchema>;
