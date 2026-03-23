import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [BullModule.registerQueue({ name: 'email' })],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
