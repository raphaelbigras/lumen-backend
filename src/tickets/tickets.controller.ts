import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  findAll(@Query() query: unknown, @Request() req) {
    return this.ticketsService.findAll(query, req.user.role, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findById(id);
  }

  @Get(':id/events')
  findEvents(@Param('id') id: string) {
    return this.ticketsService.findEvents(id);
  }

  @Post()
  create(@Body() body: unknown, @Request() req) {
    return this.ticketsService.create(body, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown, @Request() req) {
    return this.ticketsService.update(id, body, req.user.id);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() body: unknown, @Request() req) {
    return this.ticketsService.assign(id, body, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.ticketsService.remove(id, req.user);
  }
}
