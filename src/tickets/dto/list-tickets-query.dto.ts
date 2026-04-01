import { IsOptional, IsString, IsEnum, IsIn, IsNumberString } from 'class-validator';
import { TicketStatus, TicketPriority } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTicketsQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  submitterId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsIn(['title', 'status', 'priority', 'createdAt', 'updatedAt', 'category', 'submitter', 'assignee', 'department'])
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional()
  @IsNumberString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional()
  @IsNumberString()
  @IsOptional()
  limit?: string;
}
