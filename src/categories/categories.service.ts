import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private repo: CategoriesRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.repo.create({ name: dto.name });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async remove(id: string) {
    const category = await this.findById(id);
    if (category.isDefault) {
      throw new ForbiddenException('Cannot delete default categories');
    }
    return this.repo.softDelete(id);
  }
}
