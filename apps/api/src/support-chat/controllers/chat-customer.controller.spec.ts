import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupportChatService } from '../services/support-chat.service';
import { ChatCustomerController } from './chat-customer.controller';

describe('ChatCustomerController', () => {
  let controller: ChatCustomerController;
  let service: any;

  beforeEach(async () => {
    service = {
      findOrCreateChat: jest.fn(),
      findChatByCustomer: jest.fn(),
      getMessages: jest.fn(),
      isCustomerOwner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatCustomerController],
      providers: [
        {
          provide: SupportChatService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ChatCustomerController>(ChatCustomerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOrCreateChat', () => {
    it('should return existing or new chat', async () => {
      const mockChat = { id: 1 };
      service.findOrCreateChat.mockResolvedValue(mockChat);
      const user = { id: 10 } as any;

      const result = await controller.findOrCreateChat(user);
      expect(result.data).toBe(mockChat);
      expect(service.findOrCreateChat).toHaveBeenCalledWith(10);
    });
  });

  describe('getActiveChat', () => {
    it('should return active chat if exists', async () => {
      const mockChat = { id: 1 };
      service.findChatByCustomer.mockResolvedValue(mockChat);
      const user = { id: 10 } as any;

      const result = await controller.getActiveChat(user);
      expect(result.data).toBe(mockChat);
    });

    it('should return null if no active chat', async () => {
      service.findChatByCustomer.mockResolvedValue(null);
      const user = { id: 10 } as any;

      const result = await controller.getActiveChat(user);
      expect(result.data).toBeNull();
    });
  });

  describe('getMessages', () => {
    it('should return messages if user owns the chat', async () => {
      service.isCustomerOwner.mockResolvedValue(true);
      const mockMessages = { items: [], hasMore: false };
      service.getMessages.mockResolvedValue(mockMessages);
      const user = { id: 10 } as any;

      const result = await controller.getMessages(1, {}, user);
      expect(result.data).toBe(mockMessages);
      expect(service.getMessages).toHaveBeenCalledWith(1, {});
    });

    it('should throw ForbiddenException if user does not own the chat', async () => {
      service.isCustomerOwner.mockResolvedValue(false);
      const user = { id: 10 } as any;

      await expect(controller.getMessages(1, {}, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
