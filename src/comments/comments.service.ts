import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommentsRepository } from './comments.repository';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(
    private repo: CommentsRepository,
    private prisma: PrismaService,
  ) {}

  findByTicket(ticketId: string) {
    return this.repo.findByTicket(ticketId);
  }

  async create(ticketId: string, dto: CreateCommentDto, authorId: string) {
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
