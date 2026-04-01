import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TicketsRepository } from './tickets.repository';
import { createTicketSchema } from './schemas/create-ticket.schema';
import { updateTicketSchema } from './schemas/update-ticket.schema';
import { assignTicketSchema } from './schemas/assign-ticket.schema';
import { listTicketsQuerySchema } from './schemas/list-tickets-query.schema';
import { z } from 'zod';

const uuidSchema = z.string().uuid();

@Injectable()
export class TicketsService {
  constructor(
    private repo: TicketsRepository,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  findAll(query: unknown, userRole: string, userId: string) {
    const filters = listTicketsQuerySchema.parse(query);
    return this.repo.findAll({
      ...filters,
      submitterId: userRole === 'USER' ? userId : filters.submitterId,
    });
  }

  async findById(id: string) {
    uuidSchema.parse(id);
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  async findEvents(ticketId: string) {
    uuidSchema.parse(ticketId);
    return this.repo.findEventsByTicketId(ticketId);
  }

  async create(body: unknown, submitterId: string) {
    const dto = createTicketSchema.parse(body);
    const ticket = await this.repo.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      site: dto.site,
      submitter: { connect: { id: submitterId } },
      ...(dto.departmentId && { department: { connect: { id: dto.departmentId } } }),
      ...(dto.categoryId && { category: { connect: { id: dto.categoryId } } }),
    });

    await this.repo.createEvent({
      ticket: { connect: { id: ticket.id } },
      actor: { connect: { id: submitterId } },
      type: 'TICKET_CREATED',
      payload: { title: ticket.title },
    });

    await this.emailQueue.add('ticket-created', { ticketId: ticket.id });
    return ticket;
  }

  async update(id: string, body: unknown, actorId: string) {
    uuidSchema.parse(id);
    const dto = updateTicketSchema.parse(body);
    const ticket = await this.findById(id);

    const data: any = { ...dto };
    if (dto.categoryId) {
      data.category = { connect: { id: dto.categoryId } };
      delete data.categoryId;
    }
    if (dto.status === 'RESOLVED' && ticket.status !== 'RESOLVED') {
      data.resolvedAt = new Date();
    } else if (dto.status && dto.status !== 'RESOLVED' && ticket.status === 'RESOLVED') {
      data.resolvedAt = null;
    }

    const updated = await this.repo.update(id, data);

    // Status change event
    if (dto.status && dto.status !== ticket.status) {
      await this.repo.createEvent({
        ticket: { connect: { id } },
        actor: { connect: { id: actorId } },
        type: 'STATUS_CHANGED',
        payload: { from: ticket.status, to: dto.status },
      });
      await this.emailQueue.add('status-changed', { ticketId: id, status: dto.status });
    }

    // Priority change event
    if (dto.priority && dto.priority !== ticket.priority) {
      await this.repo.createEvent({
        ticket: { connect: { id } },
        actor: { connect: { id: actorId } },
        type: 'PRIORITY_CHANGED',
        payload: { from: ticket.priority, to: dto.priority },
      });
    }

    // Category change event
    if (dto.categoryId && dto.categoryId !== ticket.categoryId) {
      await this.repo.createEvent({
        ticket: { connect: { id } },
        actor: { connect: { id: actorId } },
        type: 'CATEGORY_CHANGED',
        payload: {
          fromId: ticket.categoryId,
          fromName: ticket.category?.name || null,
          toId: dto.categoryId,
        },
      });
    }

    // Title change event
    if (dto.title && dto.title !== ticket.title) {
      await this.repo.createEvent({
        ticket: { connect: { id } },
        actor: { connect: { id: actorId } },
        type: 'TITLE_CHANGED',
        payload: { from: ticket.title, to: dto.title },
      });
    }

    // Description change event
    if (dto.description && dto.description !== ticket.description) {
      await this.repo.createEvent({
        ticket: { connect: { id } },
        actor: { connect: { id: actorId } },
        type: 'DESCRIPTION_CHANGED',
        payload: {},
      });
    }

    return updated;
  }

  async assign(id: string, body: unknown, actorId: string) {
    uuidSchema.parse(id);
    const dto = assignTicketSchema.parse(body);
    const ticket = await this.findById(id);

    // Check for existing assignment to track unassign
    const currentAssignments = (ticket as any).assignments || [];
    for (const assignment of currentAssignments) {
      if (assignment.agentId !== dto.agentId) {
        await this.repo.createEvent({
          ticket: { connect: { id } },
          actor: { connect: { id: actorId } },
          type: 'UNASSIGNED',
          payload: {
            agentId: assignment.agentId,
            agentName: `${assignment.agent.firstName} ${assignment.agent.lastName}`,
          },
        });
      }
    }

    await this.repo.assignAgent(id, dto.agentId);

    // Fetch agent name for the event payload
    const updatedTicket = await this.findById(id);
    const newAssignment = (updatedTicket as any).assignments?.find(
      (a: any) => a.agentId === dto.agentId,
    );

    await this.repo.createEvent({
      ticket: { connect: { id } },
      actor: { connect: { id: actorId } },
      type: 'ASSIGNED',
      payload: {
        agentId: dto.agentId,
        agentName: newAssignment
          ? `${newAssignment.agent.firstName} ${newAssignment.agent.lastName}`
          : dto.agentId,
      },
    });

    return updatedTicket;
  }

  async remove(id: string, user: any) {
    uuidSchema.parse(id);
    const ticket = await this.findById(id);
    if (ticket.submitterId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return this.repo.softDelete(id);
  }
}
