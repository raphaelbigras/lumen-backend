import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommentsRepository } from './comments.repository';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private repo: CommentsRepository) {}

  findByTicket(ticketId: string) {
    return this.repo.findByTicket(ticketId);
  }

  create(ticketId: string, dto: CreateCommentDto, authorId: string) {
    return this.repo.create({
      body: dto.body,
      ticket: { connect: { id: ticketId } },
      author: { connect: { id: authorId } },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const comments = await this.repo.findByTicket('');
    // simplified - check ownership via direct query would be added
    return this.repo.softDelete(id);
  }
}
