import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsRepository {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { _count: { select: { tickets: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.department.findFirst({
      where: { id, deletedAt: null },
    });
  }

  create(data: Prisma.DepartmentCreateInput) {
    return this.prisma.department.create({ data });
  }

  update(id: string, data: Prisma.DepartmentUpdateInput) {
    return this.prisma.department.update({ where: { id, deletedAt: null }, data });
  }

  softDelete(id: string) {
    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
