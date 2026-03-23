import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { TicketPriority } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;
}
