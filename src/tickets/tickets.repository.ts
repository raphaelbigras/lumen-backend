import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority, Prisma } from '@prisma/client';

@Injectable()
export class TicketsRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigneeId?: string;
    categoryId?: string;
    departmentId?: string;
    submitterId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.TicketWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assignments = { some: { agentId: filters.assigneeId } };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.submitterId) where.submitterId = filters.submitterId;
    if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' };

    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
          deletedAt: true,
          submitter: { select: { id: true, firstName: true, lastName: true } },
          department: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          assignments: {
            select: { agent: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { assignedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  findById(id: string) {
    return this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        submitter: true,
        department: true,
        assignments: { include: { agent: true } },
        comments: { where: { deletedAt: null }, include: { author: true }, orderBy: { createdAt: 'asc' } },
        attachments: { where: { deletedAt: null } },
        events: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
        category: true,
      },
    });
  }

  create(data: Prisma.TicketCreateInput) {
    return this.prisma.ticket.create({ data, include: { submitter: true } });
  }

  update(id: string, data: Prisma.TicketUpdateInput) {
    return this.prisma.ticket.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.ticket.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  createEvent(data: Prisma.TicketEventCreateInput) {
    return this.prisma.ticketEvent.create({ data });
  }

  assignAgent(ticketId: string, agentId: string) {
    return this.prisma.ticketAssignment.upsert({
      where: { ticketId_agentId: { ticketId, agentId } },
      create: { ticketId, agentId },
      update: {},
    });
  }
}
