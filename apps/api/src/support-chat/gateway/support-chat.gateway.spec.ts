import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { ChatSenderType } from '../../../generated/prisma/client';
import { SupportChatService } from '../services/support-chat.service';
import { SupportChatGateway } from './support-chat.gateway';

describe('SupportChatGateway', () => {
  let gateway: SupportChatGateway;
  let service: any;
  let mockServer: any;
  let mockClient: any;

  beforeEach(async () => {
    service = {
      isCustomerOwner: jest.fn(),
      isEmployeeAssigned: jest.fn(),
      sendMessage: jest.fn(),
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
    mockClient = {
      id: 'test_client_id',
      data: { userId: 1, userType: 'CUSTOMER' },
      join: jest.fn(),
      leave: jest.fn(),
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

    it('should join room successfully', async () => {
      service.isCustomerOwner.mockResolvedValue(true);
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
  });

  describe('emitChatAssigned', () => {
    it('should emit chatAssigned event to room', () => {
      gateway.emitChatAssigned(1, { employeeId: 2 });

      expect(mockServer.to).toHaveBeenCalledWith('chat:1');
      expect(mockServer.emit).toHaveBeenCalledWith('chatAssigned', { employeeId: 2 });
    });
  });
});
