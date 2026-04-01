import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @Roles('ADMIN', 'AGENT')
  create(@Body() body: unknown) {
    return this.categoriesService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'AGENT')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.categoriesService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AGENT')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
