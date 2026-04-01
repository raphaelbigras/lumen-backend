import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AttachmentsRepository } from './attachments.repository';
import { MinioService } from './minio.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private repo: AttachmentsRepository,
    private minio: MinioService,
    private prisma: PrismaService,
  ) {}

  async upload(ticketId: string, file: Express.Multer.File, actorId: string) {
    const ext = file.originalname.split('.').pop();
    const storageKey = `tickets/${ticketId}/${uuidv4()}.${ext}`;
    await this.minio.upload(storageKey, file.buffer, file.mimetype);
    const attachment = await this.repo.create({
      ticketId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey,
    });

    await this.prisma.ticketEvent.create({
      data: {
        ticket: { connect: { id: ticketId } },
        actor: { connect: { id: actorId } },
        type: 'ATTACHMENT_ADDED',
        payload: { attachmentId: attachment.id, filename: file.originalname },
      },
    });

    return attachment;
  }

  findByTicket(ticketId: string) {
    return this.repo.findByTicket(ticketId);
  }

  async getDownloadUrl(id: string) {
    const attachment = await this.repo.findById(id);
    if (!attachment) throw new NotFoundException();
    const url = await this.minio.getPresignedUrl(attachment.storageKey);
    return { url };
  }

  async remove(id: string, actorId: string) {
    const attachment = await this.repo.findById(id);
    if (!attachment) throw new NotFoundException();
    await this.minio.delete(attachment.storageKey);
    await this.repo.softDelete(id);

    await this.prisma.ticketEvent.create({
      data: {
        ticket: { connect: { id: attachment.ticketId } },
        actor: { connect: { id: actorId } },
        type: 'ATTACHMENT_DELETED',
        payload: { attachmentId: id, filename: attachment.filename },
      },
    });
  }
}
