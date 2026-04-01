import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsRepository } from './attachments.repository';
import { MinioService } from './minio.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsRepository, MinioService],
})
export class AttachmentsModule {}
