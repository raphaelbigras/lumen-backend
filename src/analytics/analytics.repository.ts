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

  // Use SQL aggregation instead of fetching raw rows and grouping in JS
  async getVolumeByWeek(weeks: number): Promise<{ week: string; count: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const rows = await this.prisma.$queryRaw<{ week: string; count: bigint }[]>`
      SELECT date_trunc('week', "createdAt")::date::text AS week, COUNT(*)::bigint AS count
      FROM tickets
      WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL
      GROUP BY week
      ORDER BY week ASC
    `;
    return rows.map((r) => ({ week: r.week, count: Number(r.count) }));
  }

  // Combine groupBy + category name lookup into a single query
  async getCountByCategoryWithNames(): Promise<{ category: string; count: number; percentage: number }[]> {
    const rows = await this.prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT COALESCE(c.name, 'Sans catégorie') AS name, COUNT(*)::bigint AS count
      FROM tickets t
      LEFT JOIN categories c ON t."categoryId" = c.id
      WHERE t."deletedAt" IS NULL
      GROUP BY c.name
      ORDER BY count DESC
    `;
    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
    return rows.map((r) => ({
      category: r.name,
      count: Number(r.count),
      percentage: total > 0 ? Math.round((Number(r.count) / total) * 100) : 0,
    }));
  }

  // Fetch agent performance with date-filtered tickets (only current month)
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
          where: {
            ticket: {
              OR: [
                { resolvedAt: { gte: since } },
                { status: { notIn: ['RESOLVED', 'CLOSED'] } },
              ],
            },
          },
        },
      },
    });
  }

  // Use DB-level sorting by priority with LIMIT instead of fetching all then sorting in JS
  async getAttentionNeeded(limit: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT t.id, t.title, t.status, t.priority, t."createdAt", t."updatedAt",
             c.name AS "categoryName",
             u."firstName" AS "submitterFirstName", u."lastName" AS "submitterLastName"
      FROM tickets t
      LEFT JOIN categories c ON t."categoryId" = c.id
      LEFT JOIN users u ON t."submitterId" = u.id
      WHERE t."deletedAt" IS NULL
        AND t.status IN ('OPEN', 'PENDING')
        AND NOT EXISTS (SELECT 1 FROM ticket_assignments ta WHERE ta."ticketId" = t.id)
      ORDER BY
        CASE t.priority
          WHEN 'CRITICAL' THEN 0
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
          ELSE 9
        END ASC,
        t."createdAt" ASC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      priority: r.priority,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      category: r.categoryName ? { name: r.categoryName } : null,
      submitter: { firstName: r.submitterFirstName, lastName: r.submitterLastName },
    }));
  }

  async getUserTicketCounts(userId: string) {
    // Use a single raw query instead of 6 separate count queries
    const rows = await this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT status::text, COUNT(*)::bigint AS count
      FROM tickets
      WHERE "submitterId" = ${userId} AND "deletedAt" IS NULL
      GROUP BY status
    `;
    const countMap: Record<string, number> = {};
    for (const r of rows) countMap[r.status] = Number(r.count);
    const myTotalCount = Object.values(countMap).reduce((a, b) => a + b, 0);
    return {
      myOpenCount: countMap['OPEN'] || 0,
      myInProgressCount: countMap['IN_PROGRESS'] || 0,
      myResolvedCount: countMap['RESOLVED'] || 0,
      myPendingCount: countMap['PENDING'] || 0,
      myClosedCount: countMap['CLOSED'] || 0,
      myTotalCount,
    };
  }

  async getUserTickets(userId: string) {
    return this.prisma.ticket.findMany({
      where: { submitterId: userId, deletedAt: null },
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  // Use SQL aggregation instead of fetching raw rows
  async getUserVolumeByWeek(userId: string, weeks: number): Promise<{ week: string; count: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const rows = await this.prisma.$queryRaw<{ week: string; count: bigint }[]>`
      SELECT date_trunc('week', "createdAt")::date::text AS week, COUNT(*)::bigint AS count
      FROM tickets
      WHERE "submitterId" = ${userId} AND "createdAt" >= ${since} AND "deletedAt" IS NULL
      GROUP BY week
      ORDER BY week ASC
    `;
    return rows.map((r) => ({ week: r.week, count: Number(r.count) }));
  }

  // Combine groupBy + category names into a single query
  async getUserCountByCategoryWithNames(userId: string): Promise<{ category: string; count: number; percentage: number }[]> {
    const rows = await this.prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT COALESCE(c.name, 'Sans catégorie') AS name, COUNT(*)::bigint AS count
      FROM tickets t
      LEFT JOIN categories c ON t."categoryId" = c.id
      WHERE t."submitterId" = ${userId} AND t."deletedAt" IS NULL
      GROUP BY c.name
      ORDER BY count DESC
    `;
    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
    return rows.map((r) => ({
      category: r.name,
      count: Number(r.count),
      percentage: total > 0 ? Math.round((Number(r.count) / total) * 100) : 0,
    }));
  }

  async getUserResolvedTicketsWithTimes(userId: string) {
    return this.prisma.ticket.findMany({
      where: { submitterId: userId, resolvedAt: { not: null }, deletedAt: null },
      select: { createdAt: true, resolvedAt: true },
    });
  }
}
