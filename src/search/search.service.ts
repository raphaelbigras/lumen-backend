import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string) {
    return this.prisma.$queryRaw`
      SELECT id, title, description, status, priority, "createdAt"
      FROM tickets
      WHERE "deletedAt" IS NULL
        AND (
          to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', ${query})
          OR title ILIKE ${'%' + query + '%'}
        )
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;
  }
}
