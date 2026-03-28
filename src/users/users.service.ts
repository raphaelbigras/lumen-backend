import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private repo: UsersRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  findByKeycloakId(keycloakId: string) {
    return this.repo.findByKeycloakId(keycloakId);
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
}
