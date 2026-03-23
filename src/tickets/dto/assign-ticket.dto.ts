import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  agentId: string;
}
