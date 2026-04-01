import { IsString, IsNotEmpty, IsEnum, IsUUID, MaxLength, IsIn } from 'class-validator';
import { TicketPriority } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

const SITES = ['Valleyfield', 'Beauharnois', 'Montréal', 'Brossard', 'Bromont', 'Hemmingford'];

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  @IsNotEmpty()
  priority: TicketPriority;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ enum: SITES })
  @IsString()
  @IsNotEmpty()
  @IsIn(SITES)
  site: string;
}
