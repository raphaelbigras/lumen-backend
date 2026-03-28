import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ where: { deletedAt: null } });
  }

  findById(id: string) {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  findByKeycloakId(keycloakId: string) {
    return this.prisma.user.findUnique({ where: { keycloakId } });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  updateByKeycloakId(keycloakId: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { keycloakId }, data });
  }

  softDelete(id: string) {
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
