import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { z } from 'zod';
import { CommentsRepository } from './comments.repository';
import { createCommentSchema } from './schemas/create-comment.schema';
import { PrismaService } from '../prisma/prisma.service';

const uuidSchema = z.string().uuid();

@Injectable()
export class CommentsService {
  constructor(
    private repo: CommentsRepository,
    private prisma: PrismaService,
  ) {}

  findByTicket(ticketId: string) {
    uuidSchema.parse(ticketId);
    return this.repo.findByTicket(ticketId);
  }

  async create(ticketId: string, body: unknown, authorId: string) {
    const dto = createCommentSchema.parse(body);
    const comment = await this.repo.create({
      body: dto.body,
      ticket: { connect: { id: ticketId } },
      author: { connect: { id: authorId } },
    });

    await this.prisma.ticketEvent.create({
      data: {
        ticket: { connect: { id: ticketId } },
        actor: { connect: { id: authorId } },
        type: 'COMMENT_ADDED',
        payload: { commentId: comment.id },
      },
    });

    return comment;
  }

  async remove(id: string, userId: string, userRole: string) {
    uuidSchema.parse(id);
    const comment = await this.prisma.ticketComment.findFirst({ where: { id, deletedAt: null } });
    if (!comment) throw new NotFoundException();

    await this.repo.softDelete(id);

    await this.prisma.ticketEvent.create({
      data: {
        ticket: { connect: { id: comment.ticketId } },
        actor: { connect: { id: userId } },
        type: 'COMMENT_DELETED',
        payload: { commentId: id },
      },
    });
  }
}
