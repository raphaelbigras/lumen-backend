import { Controller, Get, Post, Delete, Param, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/attachments')
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Get()
  findAll(@Param('ticketId') ticketId: string) {
    return this.attachmentsService.findByTicket(ticketId);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Param('ticketId') ticketId: string, @UploadedFile() file: Express.Multer.File) {
    return this.attachmentsService.upload(ticketId, file);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string) {
    return this.attachmentsService.getDownloadUrl(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }
}
