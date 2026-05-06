import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      scanStream: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      quit: jest.fn(),
      status: 'wait',
    };
  });
});

describe('RedisService', () => {
  let service: RedisService;
  let client: jest.Mocked<Redis>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('127.0.0.1'),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    client = service.getClient() as jest.Mocked<Redis>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      client.get.mockResolvedValue(JSON.stringify({ data: 'cached' }));
      const factory = jest.fn();

      const result = await service.getOrSet('key', 60, factory);

      expect(result).toEqual({ data: 'cached' });
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache if not in redis', async () => {
      client.get.mockResolvedValue(null);
      const factory = jest.fn().mockResolvedValue({ data: 'new' });

      const result = await service.getOrSet('key', 60, factory);

      expect(result).toEqual({ data: 'new' });
      expect(factory).toHaveBeenCalled();
      expect(client.setex).toHaveBeenCalledWith('key', 60, JSON.stringify({ data: 'new' }));
    });

    it('should delete bad cached json and rebuild cache', async () => {
      client.get.mockResolvedValue('{bad-json');
      const factory = jest.fn().mockResolvedValue({ data: 'rebuilt' });
      const result = await service.getOrSet('invalid-key', 60, factory);
      expect(result).toEqual({ data: 'rebuilt' });
      expect(client.del).toHaveBeenCalledWith('invalid-key');
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('del', () => {
    it('should call del if keys provided', async () => {
      await service.del('k1', 'k2');
      expect(client.del).toHaveBeenCalledWith('k1', 'k2');
    });

    it('should do nothing if no keys provided', async () => {
      await service.del();
      expect(client.del).not.toHaveBeenCalled();
    });
  });

  describe('deleteByPattern', () => {
    it('should scan and delete keys', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Promise.resolve(['k1', 'k2']);
          yield Promise.resolve(['k3']);
        },
      };
      client.scanStream.mockReturnValue(mockStream as any);

      await service.deleteByPattern('test:*');

      expect(client.scanStream).toHaveBeenCalledWith({ match: 'test:*', count: 100 });
      expect(client.del).toHaveBeenCalledTimes(2);
    });

    it('should skip delete when scan result has no keys', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Promise.resolve([]);
        },
      };
      client.scanStream.mockReturnValue(mockStream as any);
      await service.deleteByPattern('empty:*');
      expect(client.scanStream).toHaveBeenCalledWith({ match: 'empty:*', count: 100 });
      expect(client.del).not.toHaveBeenCalled();
    });
  });

  describe('module lifecycle', () => {
    it('should connect on module init when status is wait', async () => {
      client.status = 'wait';
      await service.onModuleInit();
      expect(client.connect).toHaveBeenCalled();
    });

    it('should not connect on module init when status is ready', async () => {
      client.status = 'ready';
      await service.onModuleInit();
      expect(client.connect).not.toHaveBeenCalled();
    });

    it('should disconnect on destroy when status is wait', async () => {
      client.status = 'wait';
      await service.onModuleDestroy();
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.quit).not.toHaveBeenCalled();
    });

    it('should quit on destroy when status is connected', async () => {
      client.status = 'ready';
      await service.onModuleDestroy();
      expect(client.quit).toHaveBeenCalled();
    });

    it('should skip disconnect on destroy when status is end', async () => {
      client.status = 'end';
      await service.onModuleDestroy();
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(client.quit).not.toHaveBeenCalled();
    });
  });

  describe('constructor configuration', () => {
    it('should initialize redis with REDIS_URL when provided', async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RedisService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, fallback?: unknown) => {
                if (key === 'REDIS_URL') return 'redis://localhost:6379';
                return fallback;
              }),
            },
          },
        ],
      }).compile();
      module.get<RedisService>(RedisService);
      expect(Redis).toHaveBeenCalledWith(
        'redis://localhost:6379',
        expect.objectContaining({ lazyConnect: true }),
      );
    });
  });
});
