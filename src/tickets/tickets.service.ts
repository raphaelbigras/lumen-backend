import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TicketsRepository } from './tickets.repository';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private repo: TicketsRepository,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  findAll(filters: any) {
    return this.repo.findAll(filters);
  }

  async findById(id: string) {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  async create(dto: CreateTicketDto, submitterId: string) {
    const ticket = await this.repo.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
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

  async update(id: string, dto: UpdateTicketDto, actorId: string) {
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

    if (dto.status && dto.status !== ticket.status) {
      await this.repo.createEvent({
        ticket: { connect: { id } },
        actor: { connect: { id: actorId } },
        type: 'STATUS_CHANGED',
        payload: { from: ticket.status, to: dto.status },
      });
      await this.emailQueue.add('status-changed', { ticketId: id, status: dto.status });
    }

    return updated;
  }

  async assign(id: string, dto: AssignTicketDto, actorId: string) {
    await this.findById(id);
    await this.repo.assignAgent(id, dto.agentId);
    await this.repo.createEvent({
      ticket: { connect: { id } },
      actor: { connect: { id: actorId } },
      type: 'ASSIGNED',
      payload: { agentId: dto.agentId },
    });
    return this.findById(id);
  }

  async remove(id: string, user: any) {
    const ticket = await this.findById(id);
    if (ticket.submitterId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return this.repo.softDelete(id);
  }
}
