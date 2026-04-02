import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { UsersRepository } from './users.repository';
import { updateUserRoleSchema } from './schemas/update-user-role.schema';

const uuidSchema = z.string().uuid();

@Injectable()
export class UsersService {
  constructor(private repo: UsersRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    uuidSchema.parse(id);
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  findByKeycloakId(keycloakId: string) {
    return this.repo.findByKeycloakId(keycloakId);
  }

  findByEmail(email: string) {
    return this.repo.findByEmail(email);
  }

  create(data: { keycloakId: string; email: string; firstName: string; lastName: string; role?: any }) {
    return this.repo.create(data);
  }

  update(id: string, data: any) {
    return this.repo.update(id, data);
  }

  updateRole(keycloakId: string, role: string) {
    return this.repo.updateByKeycloakId(keycloakId, { role: role as any });
  }

  async updateUserRole(id: string, body: unknown) {
    uuidSchema.parse(id);
    const dto = updateUserRoleSchema.parse(body);
    return this.repo.update(id, { role: dto.role as any });
  }
}
