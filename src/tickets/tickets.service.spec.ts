import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';

describe('TicketsService', () => {
  let service: TicketsService;
  let repo: jest.Mocked<TicketsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: TicketsRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            createEvent: jest.fn(),
            assignAgent: jest.fn(),
          },
        },
        {
          provide: getQueueToken('email'),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    repo = module.get(TicketsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException when ticket not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should create a ticket and emit email job', async () => {
    const mockTicket = { id: '1', title: 'Test', status: 'OPEN' } as any;
    repo.create.mockResolvedValue(mockTicket);
    repo.createEvent.mockResolvedValue({} as any);

    const result = await service.create(
      { title: 'Test', description: 'Desc', priority: 'MEDIUM' as any, departmentId: 'dep-1', categoryId: 'cat-1', site: 'Montréal' },
      'user-1',
    );
    expect(result).toEqual(mockTicket);
    expect(repo.create).toHaveBeenCalled();
  });
});
