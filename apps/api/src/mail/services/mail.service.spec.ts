import { getQueueToken } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as nodemailer from 'nodemailer';
import { MAIL_QUEUE } from '../mail.constants';
import { MailService } from './mail.service';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let queue: any;

  const mockQueue = {
    add: jest.fn(),
  };

  const mockTransporter = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'SMTP_FROM') return 'VNMIXX <no-reply@vnmixx.vn>';
              if (key === 'SMTP_HOST') return 'smtp.test';
              if (key === 'SMTP_PORT') return 587;
              return null;
            }),
          },
        },
        {
          provide: getQueueToken(MAIL_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    queue = module.get(getQueueToken(MAIL_QUEUE));

    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('isConfigured should return true if SMTP and sender present', () => {
    expect(service.isConfigured()).toBe(true);
  });

  it('sendMail should add job to queue if configured', async () => {
    const options = { to: 't@t.com', subject: 'S', html: 'H', text: 'T' };
    await service.sendMail(options);
    expect(queue.add).toHaveBeenCalledWith('send', options, expect.any(Object));
  });

  it('sendMail should log and not queue if not configured', async () => {
    const nullConfig = {
      get: jest.fn().mockReturnValue(null),
      getOrThrow: jest.fn().mockReturnValue(null),
    } as any;
    const localService = new MailService(nullConfig, queue);

    queue.add.mockClear();

    const options = { to: 't@t.com', subject: 'S', html: 'H', text: 'T' };
    await localService.sendMail(options);

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('sendMailDirect should call transporter.sendMail', async () => {
    const options = { to: 't@t.com', subject: 'S', html: 'H', text: 'T' };
    await service.sendMailDirect(options);
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: options.to,
        from: 'VNMIXX <no-reply@vnmixx.vn>',
      }),
    );
  });

  it('sendMailWithTemplate should render and queue', async () => {
    await service.sendMailWithTemplate('t@t.com', 'VERIFICATION_OTP', { otp: '123' });
    expect(queue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({
        to: 't@t.com',
        subject: expect.stringContaining('xác thực'),
      }),
      expect.any(Object),
    );
  });
});
