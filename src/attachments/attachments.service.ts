import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AttachmentsRepository } from './attachments.repository';
import { MinioService } from './minio.service';

@Injectable()
export class AttachmentsService {
  constructor(private repo: AttachmentsRepository, private minio: MinioService) {}

  async upload(ticketId: string, file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop();
    const storageKey = `tickets/${ticketId}/${uuidv4()}.${ext}`;
    await this.minio.upload(storageKey, file.buffer, file.mimetype);
    return this.repo.create({
      ticketId,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey,
    });
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

  async remove(id: string) {
    const attachment = await this.repo.findById(id);
    if (!attachment) throw new NotFoundException();
    await this.minio.delete(attachment.storageKey);
    return this.repo.softDelete(id);
  }
}
