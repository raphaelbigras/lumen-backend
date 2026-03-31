import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsRepository {
  constructor(private prisma: PrismaService) {}

  async getTicketCounts() {
    const [openCount, inProgressCount, unassignedCount] = await Promise.all([
      this.prisma.ticket.count({ where: { status: 'OPEN', deletedAt: null } }),
      this.prisma.ticket.count({ where: { status: 'IN_PROGRESS', deletedAt: null } }),
      this.prisma.ticket.count({
        where: {
          deletedAt: null,
          status: { notIn: ['CLOSED', 'RESOLVED'] },
          assignments: { none: {} },
        },
      }),
    ]);
    return { openCount, inProgressCount, unassignedCount };
  }

  async getCreatedCountByStatusInRange(status: string, since: Date, until?: Date) {
    const where: any = { status, deletedAt: null, createdAt: { gte: since } };
    if (until) where.createdAt.lt = until;
    return this.prisma.ticket.count({ where });
  }

  async getResolvedCount(since: Date, until?: Date) {
    const where: any = { deletedAt: null, resolvedAt: { gte: since } };
    if (until) where.resolvedAt.lt = until;
    return this.prisma.ticket.count({ where });
  }

  async getResolvedTicketsWithTimes(since: Date, until?: Date) {
    const where: any = { resolvedAt: { not: null, gte: since }, deletedAt: null };
    if (until) where.resolvedAt.lt = until;
    return this.prisma.ticket.findMany({
      where,
      select: { createdAt: true, resolvedAt: true },
    });
  }

  async getVolumeByWeek(weeks: number) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    return this.prisma.ticket.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getCountByCategory() {
    return this.prisma.ticket.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null, categoryId: { not: null } },
      _count: true,
    });
  }

  async getCategoryNames(ids: string[]) {
    return this.prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
  }

  async getAgentPerformance(since: Date) {
    return this.prisma.user.findMany({
      where: { role: 'AGENT', deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedTickets: {
          select: {
            ticket: {
              select: { status: true, createdAt: true, resolvedAt: true },
            },
          },
        },
      },
    });
  }

  async getAttentionNeeded(limit: number) {
    // Prisma sorts enums alphabetically, so we fetch and sort in JS by severity
    const tickets = await this.prisma.ticket.findMany({
      where: {
        deletedAt: null,
        status: { in: ['OPEN', 'PENDING'] },
        assignments: { none: {} },
      },
      include: {
        category: { select: { name: true } },
        submitter: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return tickets
      .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))
      .slice(0, limit);
  }

  async getUserTicketCounts(userId: string) {
    const [myOpenCount, myInProgressCount, myResolvedCount, myPendingCount, myClosedCount, myTotalCount] = await Promise.all([
      this.prisma.ticket.count({ where: { submitterId: userId, status: 'OPEN', deletedAt: null } }),
      this.prisma.ticket.count({ where: { submitterId: userId, status: 'IN_PROGRESS', deletedAt: null } }),
      this.prisma.ticket.count({ where: { submitterId: userId, status: 'RESOLVED', deletedAt: null } }),
      this.prisma.ticket.count({ where: { submitterId: userId, status: 'PENDING', deletedAt: null } }),
      this.prisma.ticket.count({ where: { submitterId: userId, status: 'CLOSED', deletedAt: null } }),
      this.prisma.ticket.count({ where: { submitterId: userId, deletedAt: null } }),
    ]);
    return { myOpenCount, myInProgressCount, myResolvedCount, myPendingCount, myClosedCount, myTotalCount };
  }

  async getUserTickets(userId: string) {
    return this.prisma.ticket.findMany({
      where: { submitterId: userId, deletedAt: null },
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  async getUserVolumeByWeek(userId: string, weeks: number) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    return this.prisma.ticket.findMany({
      where: { submitterId: userId, createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getUserCountByCategory(userId: string) {
    return this.prisma.ticket.groupBy({
      by: ['categoryId'],
      where: { submitterId: userId, deletedAt: null, categoryId: { not: null } },
      _count: true,
    });
  }

  async getUserResolvedTicketsWithTimes(userId: string) {
    return this.prisma.ticket.findMany({
      where: { submitterId: userId, resolvedAt: { not: null }, deletedAt: null },
      select: { createdAt: true, resolvedAt: true },
    });
  }
}
