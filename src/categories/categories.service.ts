import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { createCategorySchema } from './schemas/create-category.schema';
import { updateCategorySchema } from './schemas/update-category.schema';
import { z } from 'zod';

const uuidSchema = z.string().uuid();

@Injectable()
export class CategoriesService {
  constructor(private repo: CategoriesRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    uuidSchema.parse(id);
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  create(body: unknown) {
    const dto = createCategorySchema.parse(body);
    return this.repo.create({ name: dto.name });
  }

  async update(id: string, body: unknown) {
    uuidSchema.parse(id);
    const dto = updateCategorySchema.parse(body);
    await this.findById(id);
    return this.repo.update(id, { name: dto.name });
  }

  async remove(id: string) {
    uuidSchema.parse(id);
    const category = await this.findById(id);
    if (category.isDefault) {
      throw new ForbiddenException('Cannot delete default categories');
    }
    return this.repo.softDelete(id);
  }
}
