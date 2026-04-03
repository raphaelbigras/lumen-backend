import { z } from 'zod';

const SORT_FIELDS = ['ticketNumber', 'title', 'status', 'priority', 'createdAt', 'updatedAt', 'category', 'submitter', 'assignee', 'department', 'site'] as const;

export const listTicketsQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigneeId: z.string().optional(),
  categoryId: z.string().optional(),
  departmentId: z.string().optional(),
  submitterId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(SORT_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
