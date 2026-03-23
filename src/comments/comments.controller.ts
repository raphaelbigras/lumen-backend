import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get()
  findAll(@Param('ticketId') ticketId: string) {
    return this.commentsService.findByTicket(ticketId);
  }

  @Post()
  create(@Param('ticketId') ticketId: string, @Body() dto: CreateCommentDto, @Request() req) {
    return this.commentsService.create(ticketId, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user.id, req.user.role);
  }
}
