import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { DepartmentsRepository } from './departments.repository';
import { createDepartmentSchema } from './schemas/create-department.schema';
import { updateDepartmentSchema } from './schemas/update-department.schema';

const uuidSchema = z.string().uuid();

@Injectable()
export class DepartmentsService {
  constructor(private repo: DepartmentsRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    uuidSchema.parse(id);
    const department = await this.repo.findById(id);
    if (!department) throw new NotFoundException(`Department ${id} not found`);
    return department;
  }

  create(body: unknown) {
    const dto = createDepartmentSchema.parse(body);
    return this.repo.create({ name: dto.name });
  }

  async update(id: string, body: unknown) {
    uuidSchema.parse(id);
    const dto = updateDepartmentSchema.parse(body);
    await this.findById(id);
    return this.repo.update(id, { name: dto.name });
  }

  async remove(id: string) {
    uuidSchema.parse(id);
    await this.findById(id);
    return this.repo.softDelete(id);
  }
}
