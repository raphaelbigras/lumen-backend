import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommentsRepository {
  constructor(private prisma: PrismaService) {}

  findByTicket(ticketId: string) {
    return this.prisma.ticketComment.findMany({
      where: { ticketId, deletedAt: null },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(data: Prisma.TicketCommentCreateInput) {
    return this.prisma.ticketComment.create({ data, include: { author: true } });
  }

  softDelete(id: string) {
    return this.prisma.ticketComment.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
