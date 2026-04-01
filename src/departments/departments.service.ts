import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private repo: DepartmentsRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const department = await this.repo.findById(id);
    if (!department) throw new NotFoundException(`Department ${id} not found`);
    return department;
  }

  create(dto: CreateDepartmentDto) {
    return this.repo.create({ name: dto.name });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findById(id);
    return this.repo.update(id, { name: dto.name });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.repo.softDelete(id);
  }
}
