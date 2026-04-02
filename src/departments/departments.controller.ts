import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Post()
  @Roles('ADMIN', 'AGENT')
  create(@Body() body: unknown) {
    return this.departmentsService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'AGENT')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.departmentsService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AGENT')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
