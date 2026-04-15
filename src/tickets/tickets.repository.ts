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

    const relationSortMap: Record<string, Prisma.TicketOrderByWithRelationInput> = {
      category: { category: { name: sortOrder } },
      submitter: { submitter: { lastName: sortOrder } },
      department: { department: { name: sortOrder } },
      assignee: { assignments: { _count: sortOrder } },
    };
    const orderBy = relationSortMap[sortBy] || { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
          deletedAt: true,
          site: true,
          submitter: { select: { id: true, firstName: true, lastName: true } },
          department: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          assignments: {
            select: { agent: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { assignedAt: 'desc' },
            take: 1,
          },
        },
        orderBy,
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

  findByIdLight(id: string) {
    return this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        submitterId: true,
        departmentId: true,
        categoryId: true,
        resolvedAt: true,
        department: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
  }

  async findUserName(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    return u ? `${u.firstName} ${u.lastName}` : null;
  }

  findAssignmentsForTicket(ticketId: string) {
    return this.prisma.ticketAssignment.findMany({
      where: { ticketId },
      select: {
        agentId: true,
        agent: { select: { firstName: true, lastName: true } },
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

  findEventsByTicketId(ticketId: string) {
    return this.prisma.ticketEvent.findMany({
      where: { ticketId },
      include: { actor: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  assignAgent(ticketId: string, agentId: string) {
    return this.prisma.ticketAssignment.upsert({
      where: { ticketId_agentId: { ticketId, agentId } },
      create: { ticketId, agentId },
      update: {},
    });
  }

  replaceAssignment(params: {
    ticketId: string;
    agentId: string;
    actorId: string;
    unassignEvents: { agentId: string; agentName: string }[];
    assignedAgentName: string;
  }) {
    const { ticketId, agentId, actorId, unassignEvents, assignedAgentName } = params;
    return this.prisma.$transaction([
      ...unassignEvents.map((u) =>
        this.prisma.ticketEvent.create({
          data: {
            ticket: { connect: { id: ticketId } },
            actor: { connect: { id: actorId } },
            type: 'UNASSIGNED',
            payload: { agentId: u.agentId, agentName: u.agentName },
          },
        }),
      ),
      this.prisma.ticketAssignment.upsert({
        where: { ticketId_agentId: { ticketId, agentId } },
        create: { ticketId, agentId },
        update: {},
      }),
      this.prisma.ticketEvent.create({
        data: {
          ticket: { connect: { id: ticketId } },
          actor: { connect: { id: actorId } },
          type: 'ASSIGNED',
          payload: { agentId, agentName: assignedAgentName },
        },
      }),
    ]);
  }
}
