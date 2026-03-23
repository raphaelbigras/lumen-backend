import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsRepository {
  constructor(private prisma: PrismaService) {}

  create(data: { ticketId: string; filename: string; mimeType: string; size: number; storageKey: string }) {
    return this.prisma.attachment.create({ data });
  }

  findByTicket(ticketId: string) {
    return this.prisma.attachment.findMany({ where: { ticketId, deletedAt: null } });
  }

  findById(id: string) {
    return this.prisma.attachment.findFirst({ where: { id, deletedAt: null } });
  }

  softDelete(id: string) {
    return this.prisma.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
