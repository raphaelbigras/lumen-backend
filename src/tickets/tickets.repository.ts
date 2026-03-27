import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority, Prisma } from '@prisma/client';

@Injectable()
export class TicketsRepository {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string }) {
    const where: Prisma.TicketWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assignments = { some: { agentId: filters.assigneeId } };
    return this.prisma.ticket.findMany({
      where,
      include: { submitter: true, assignments: { include: { agent: true } }, category: true },
      orderBy: { createdAt: 'desc' },
    });
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
