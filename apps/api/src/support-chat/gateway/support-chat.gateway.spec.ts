import { getQueueToken } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { ChatSenderType } from '../../../generated/prisma/client';
import { EmployeeAuthzCacheService } from '../../auth/services/employee-authz-cache.service';
import { SupportChatAiProcessor } from '../processors/support-chat-ai.processor';
import { SupportChatRepository } from '../repositories/support-chat.repository';
import { SupportChatService } from '../services/support-chat.service';
import { SUPPORT_CHAT_AI_QUEUE } from '../support-chat.constants';
import { WsCombinedAuthGuard } from '../ws-combined-auth.guard';
import { WsGuestGuard } from '../ws-guest.guard';
import { WsJwtGuard } from '../ws-jwt.guard';
import { SupportChatGateway } from './support-chat.gateway';

describe('SupportChatGateway', () => {
  let gateway: SupportChatGateway;
  let service: any;
  let repository: any;
  let aiProcessor: any;
  let aiQueue: any;
  let mockServer: any;
  let mockClient: any;
  let mockClientRoomEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    service = {
      isCustomerOwner: jest.fn(),
      isEmployeeAssigned: jest.fn(),
      isGuestOwner: jest.fn(),
      sendMessage: jest.fn(),
    };
    repository = {
      findChatAiContext: jest.fn().mockResolvedValue(null),
    };
    aiProcessor = {
      setServer: jest.fn(),
      isChatResponding: jest.fn().mockReturnValue(false),
      markChatResponding: jest.fn(),
      cancelChatResponse: jest.fn().mockResolvedValue(true),
    };
    aiQueue = {
      remove: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportChatGateway,
        {
          provide: SupportChatService,
          useValue: service,
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: EmployeeAuthzCacheService,
          useValue: {
            getRolesAndPermissions: jest.fn().mockResolvedValue({ roles: [], permissions: [] }),
          },
        },
        {
          provide: SupportChatRepository,
          useValue: repository,
        },
        {
          provide: SupportChatAiProcessor,
          useValue: aiProcessor,
        },
        {
          provide: getQueueToken(SUPPORT_CHAT_AI_QUEUE),
          useValue: aiQueue,
        },
        WsJwtGuard,
        WsGuestGuard,
        WsCombinedAuthGuard,
      ],
    }).compile();

    gateway = module.get<SupportChatGateway>(SupportChatGateway);

    // Mock WebSocket Server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    (gateway as any).server = mockServer;

    // Mock Socket Client
    mockClientRoomEmitter = {
      emit: jest.fn(),
    };
    mockClient = {
      id: 'test_client_id',
      data: { userId: 1, userType: 'CUSTOMER' },
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnValue(mockClientRoomEmitter),
    };
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinChat', () => {
    it('should throw WsException if customer does not own chat', async () => {
      service.isCustomerOwner.mockResolvedValue(false);
      await expect(gateway.handleJoinChat(mockClient, { chatId: 1 })).rejects.toThrow(WsException);
    });

    it('should throw WsException if employee is not assigned', async () => {
      mockClient.data.userType = 'EMPLOYEE';
      service.isEmployeeAssigned.mockResolvedValue(false);
      await expect(gateway.handleJoinChat(mockClient, { chatId: 1 })).rejects.toThrow(WsException);
    });

    it('should throw WsException if guest does not own chat', async () => {
      mockClient.data = { userType: 'GUEST', guestSecretHash: 'abc123' };
      service.isGuestOwner.mockResolvedValue(false);
      await expect(gateway.handleJoinChat(mockClient, { chatId: 1 })).rejects.toThrow(WsException);
    });

    it('should join room successfully', async () => {
      service.isCustomerOwner.mockResolvedValue(true);
      const result = await gateway.handleJoinChat(mockClient, { chatId: 1 });

      expect(mockClient.join).toHaveBeenCalledWith('chat:1');
      expect(result).toEqual({ chatId: 1 });
    });

    it('should join room successfully for guest', async () => {
      mockClient.data = { userType: 'GUEST', guestSecretHash: 'abc123' };
      service.isGuestOwner.mockResolvedValue(true);
      const result = await gateway.handleJoinChat(mockClient, { chatId: 1 });

      expect(mockClient.join).toHaveBeenCalledWith('chat:1');
      expect(result).toEqual({ chatId: 1 });
    });
  });

  describe('handleLeaveChat', () => {
    it('should leave room successfully', async () => {
      const result = await gateway.handleLeaveChat(mockClient, { chatId: 1 });

      expect(mockClient.leave).toHaveBeenCalledWith('chat:1');
      expect(result).toEqual({ chatId: 1 });
    });
  });

  describe('handleSendMessage', () => {
    it('should throw WsException if content is empty', async () => {
      await expect(
        gateway.handleSendMessage(mockClient, { chatId: 1, content: '   ' }),
      ).rejects.toThrow(WsException);
    });

    it('should throw WsException if content is too long', async () => {
      const longContent = 'a'.repeat(2001);
      await expect(
        gateway.handleSendMessage(mockClient, { chatId: 1, content: longContent }),
      ).rejects.toThrow(WsException);
    });

    it('should throw WsException if user does not have access', async () => {
      service.isCustomerOwner.mockResolvedValue(false);
      await expect(
        gateway.handleSendMessage(mockClient, { chatId: 1, content: 'Hello' }),
      ).rejects.toThrow(WsException);
    });

    it('should send message and broadcast to room', async () => {
      service.isCustomerOwner.mockResolvedValue(true);
      const mockMessage = { id: 100, content: 'Hello' };
      service.sendMessage.mockResolvedValue(mockMessage);

      const result = await gateway.handleSendMessage(mockClient, { chatId: 1, content: 'Hello' });

      expect(service.sendMessage).toHaveBeenCalledWith({
        chatId: 1,
        senderType: ChatSenderType.CUSTOMER,
        senderId: 1,
        content: 'Hello',
      });
      expect(mockServer.to).toHaveBeenCalledWith('chat:1');
      expect(mockServer.emit).toHaveBeenCalledWith('newMessage', mockMessage);
      expect(result).toBe(mockMessage);
    });

    it('should block customer when AI is still responding in AUTO mode', async () => {
      service.isCustomerOwner.mockResolvedValue(true);
      repository.findChatAiContext.mockResolvedValue({
        id: 1,
        aiMode: 'AUTO',
        status: 'OPEN',
      });
      aiProcessor.isChatResponding.mockReturnValue(true);
      await expect(
        gateway.handleSendMessage(mockClient, { chatId: 1, content: 'Second message' }),
      ).rejects.toThrow(WsException);
    });

    it('should send guest message without senderId', async () => {
      mockClient.data = { userType: 'GUEST', guestSecretHash: 'abc123' };
      service.isGuestOwner.mockResolvedValue(true);
      const mockMessage = { id: 200, content: 'Guest hello' };
      service.sendMessage.mockResolvedValue(mockMessage);

      const result = await gateway.handleSendMessage(mockClient, {
        chatId: 1,
        content: 'Guest hello',
      });

      expect(service.sendMessage).toHaveBeenCalledWith({
        chatId: 1,
        senderType: ChatSenderType.GUEST,
        senderId: undefined,
        content: 'Guest hello',
      });
      expect(result).toBe(mockMessage);
    });

    it('should not enqueue AI when chat is waiting for human', async () => {
      service.isCustomerOwner.mockResolvedValue(true);
      repository.findChatAiContext.mockResolvedValue({
        id: 1,
        aiMode: 'AUTO',
        status: 'WAITING_HUMAN',
      });
      const mockMessage = { id: 300, content: 'Xin gặp nhân viên' };
      service.sendMessage.mockResolvedValue(mockMessage);

      const result = await gateway.handleSendMessage(mockClient, {
        chatId: 1,
        content: 'Xin gặp nhân viên',
      });

      expect(aiQueue.add).not.toHaveBeenCalled();
      expect(aiProcessor.markChatResponding).not.toHaveBeenCalled();
      expect(result).toBe(mockMessage);
    });
  });

  describe('handleStopAiResponse', () => {
    it('should stop AI response for customer in AUTO mode', async () => {
      service.isCustomerOwner.mockResolvedValue(true);
      repository.findChatAiContext.mockResolvedValue({
        id: 1,
        aiMode: 'AUTO',
        status: 'OPEN',
      });
      aiProcessor.cancelChatResponse.mockResolvedValue(true);

      const result = await gateway.handleStopAiResponse(mockClient, { chatId: 1 });

      expect(aiProcessor.cancelChatResponse).toHaveBeenCalledWith(1);
      expect(mockServer.to).toHaveBeenCalledWith('chat:1');
      expect(mockServer.emit).toHaveBeenCalledWith('ai:thinking', { chatId: 1, isThinking: false });
      expect(result).toEqual({ chatId: 1, stopped: true });
    });
  });

  describe('emitChatAssigned', () => {
    it('should emit chatAssigned event to room', () => {
      gateway.emitChatAssigned(1, { employeeId: 2 });

      expect(mockServer.to).toHaveBeenCalledWith('chat:1');
      expect(mockServer.emit).toHaveBeenCalledWith('chatAssigned', { employeeId: 2 });
    });
  });

  describe('handleTyping', () => {
    it('should throw WsException if payload is invalid', async () => {
      await expect(
        gateway.handleTyping(mockClient, { chatId: 1, isTyping: 'yes' as never }),
      ).rejects.toThrow(WsException);
    });

    it('should throw WsException if user does not have access', async () => {
      service.isCustomerOwner.mockResolvedValue(false);
      await expect(gateway.handleTyping(mockClient, { chatId: 1, isTyping: true })).rejects.toThrow(
        WsException,
      );
    });

    it('should emit typing event to room except sender', async () => {
      service.isCustomerOwner.mockResolvedValue(true);
      const result = await gateway.handleTyping(mockClient, { chatId: 1, isTyping: true });

      expect(mockClient.to).toHaveBeenCalledWith('chat:1');
      expect(mockClientRoomEmitter.emit).toHaveBeenCalledWith('typing', {
        chatId: 1,
        isTyping: true,
        senderType: 'CUSTOMER',
        senderCustomerId: 1,
        senderEmployeeId: null,
      });
      expect(result).toEqual({ chatId: 1, isTyping: true });
    });
  });
});
