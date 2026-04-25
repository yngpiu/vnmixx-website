import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatSenderType } from '../../../generated/prisma/client';
import { SupportChatRepository } from '../repositories/support-chat.repository';
import { SupportChatService } from './support-chat.service';

describe('SupportChatService', () => {
  let service: SupportChatService;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findByCustomerId: jest.fn(),
      findById: jest.fn(),
      existsById: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findByEmployeeId: jest.fn(),
      findAssignment: jest.fn(),
      createAssignment: jest.fn(),
      createMessage: jest.fn(),
      findMessages: jest.fn(),
      findCustomerNames: jest.fn(),
      findEmployeeNames: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportChatService,
        {
          provide: SupportChatRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<SupportChatService>(SupportChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateChat', () => {
    it('should return existing chat if found', async () => {
      const mockChat = {
        id: 1,
        customerId: 10,
        createdAt: new Date(),
        customer: { fullName: 'Test' },
        assignments: [],
      };
      repository.findByCustomerId.mockResolvedValue(mockChat);

      const result = await service.findOrCreateChat(10);
      expect(result.id).toBe(1);
      expect(repository.findByCustomerId).toHaveBeenCalledWith(10);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create new chat if not found', async () => {
      repository.findByCustomerId.mockResolvedValue(null);
      const newChat = {
        id: 2,
        customerId: 10,
        createdAt: new Date(),
        customer: { fullName: 'Test' },
        assignments: [],
      };
      repository.create.mockResolvedValue(newChat);

      const result = await service.findOrCreateChat(10);
      expect(result.id).toBe(2);
      expect(repository.create).toHaveBeenCalledWith(10);
    });
  });

  describe('getChatDetail', () => {
    it('should throw NotFoundException if chat not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getChatDetail(1)).rejects.toThrow(NotFoundException);
    });

    it('should return chat detail if found', async () => {
      const mockDetail = {
        id: 1,
        customerId: 10,
        createdAt: new Date(),
        customer: { fullName: 'Test' },
        assignments: [],
      };
      repository.findById.mockResolvedValue(mockDetail);
      const result = await service.getChatDetail(1);
      expect(result.id).toBe(1);
    });
  });

  describe('assignEmployee', () => {
    it('should throw NotFoundException if chat not found', async () => {
      repository.existsById.mockResolvedValue(false);
      await expect(service.assignEmployee(1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already assigned', async () => {
      repository.existsById.mockResolvedValue(true);
      repository.findAssignment.mockResolvedValue({ chatId: 1, employeeId: 2 });
      await expect(service.assignEmployee(1, 2)).rejects.toThrow(ConflictException);
    });

    it('should assign employee successfully', async () => {
      repository.existsById.mockResolvedValue(true);
      repository.findAssignment.mockResolvedValue(null);
      repository.createAssignment.mockResolvedValue({ chatId: 1, employeeId: 2 });
      repository.findById.mockResolvedValue({
        id: 1,
        customerId: 10,
        createdAt: new Date(),
        customer: { fullName: 'Test' },
        assignments: [],
      });

      await service.assignEmployee(1, 2);
      expect(repository.createAssignment).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('sendMessage', () => {
    it('should send message and map sender name correctly', async () => {
      const input = {
        chatId: 1,
        senderType: ChatSenderType.CUSTOMER,
        senderId: 10,
        content: 'Hello',
      };

      const createdMessage = {
        id: 100,
        chatId: 1,
        senderType: ChatSenderType.CUSTOMER,
        senderCustomerId: 10,
        senderEmployeeId: null,
        content: 'Hello',
        createdAt: new Date(),
      };

      repository.existsById.mockResolvedValue(true);
      repository.createMessage.mockResolvedValue(createdMessage);
      repository.findCustomerNames.mockResolvedValue([{ id: 10, fullName: 'John Doe' }]);
      repository.findEmployeeNames.mockResolvedValue([]);

      const result = await service.sendMessage(input);
      expect(result.id).toBe(100);
      expect(result.senderName).toBe('John Doe');
      expect(repository.createMessage).toHaveBeenCalledWith(input);
    });
  });

  describe('isCustomerOwner', () => {
    it('should return true if customer owns chat', async () => {
      repository.findByCustomerId.mockResolvedValue({ id: 1, customerId: 10 });
      const result = await service.isCustomerOwner(1, 10);
      expect(result).toBe(true);
    });

    it('should return false if customer does not own chat', async () => {
      repository.findByCustomerId.mockResolvedValue(null);
      const result = await service.isCustomerOwner(1, 10);
      expect(result).toBe(false);
    });
  });

  describe('isEmployeeAssigned', () => {
    it('should return true if employee is assigned', async () => {
      repository.findAssignment.mockResolvedValue({ chatId: 1, employeeId: 2 });
      const result = await service.isEmployeeAssigned(1, 2);
      expect(result).toBe(true);
    });

    it('should return false if employee is not assigned', async () => {
      repository.findAssignment.mockResolvedValue(null);
      const result = await service.isEmployeeAssigned(1, 2);
      expect(result).toBe(false);
    });
  });
});
