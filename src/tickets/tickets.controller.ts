import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  findAll(@Query() query: any) {
    return this.ticketsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateTicketDto, @Request() req) {
    return this.ticketsService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Request() req) {
    return this.ticketsService.update(id, dto, req.user.id);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto, @Request() req) {
    return this.ticketsService.assign(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.ticketsService.remove(id, req.user);
  }
}
