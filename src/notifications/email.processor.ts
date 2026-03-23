import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';

@Processor('email')
export class EmailProcessor {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false,
    });
  }

  @Process('ticket-created')
  async handleTicketCreated(job: Job<{ ticketId: string }>) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@lumen.local',
      to: 'team@lumen.local',
      subject: `New ticket created`,
      text: `A new ticket (${job.data.ticketId}) has been created.`,
    });
  }

  @Process('status-changed')
  async handleStatusChanged(job: Job<{ ticketId: string; status: string }>) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@lumen.local',
      to: 'team@lumen.local',
      subject: `Ticket status updated`,
      text: `Ticket ${job.data.ticketId} status changed to ${job.data.status}.`,
    });
  }
}
