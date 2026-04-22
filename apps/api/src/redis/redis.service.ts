import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

// RedisService: Quản lý kết nối và cung cấp các tiện ích làm việc với Redis.
// Hỗ trợ các thao tác cache-aside, xóa theo pattern và quản lý vòng đời kết nối để tối ưu hiệu năng ứng dụng.
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    const options = this.buildOptions();

    // 1. Khởi tạo instance Redis client dựa trên URL hoặc các tùy chọn cấu hình rời
    this.client = redisUrl ? new Redis(redisUrl, options) : new Redis(options);

    // 2. Đăng ký các sự kiện lỗi và kết nối để phục vụ giám sát hệ thống (Monitoring)
    this.client.on('error', (error) => {
      this.logger.error(`Lỗi kết nối Redis: ${error.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Đã kết nối thành công tới Redis');
    });
  }

  // Kết nối tới Redis khi module được khởi tạo nếu đang ở trạng thái chờ (lazy connect)
  async onModuleInit(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  // Đóng kết nối Redis an toàn khi ứng dụng tắt để tránh rò rỉ tài nguyên hệ thống
  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') {
      return;
    }
    if (this.client.status === 'wait') {
      this.client.disconnect();
      return;
    }
    await this.client.quit();
  }

  // Trả về instance gốc của ioredis để thực hiện các lệnh nâng cao không có trong helper
  getClient(): Redis {
    return this.client;
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────────

  // Pattern Cache-aside: Lấy dữ liệu từ cache, nếu không có thì gọi factory để lấy dữ liệu mới.
  // Logic này giúp giảm tải cho cơ sở dữ liệu chính (DB) và tăng tốc độ phản hồi API.
  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    // 1. Kiểm tra xem dữ liệu đã tồn tại trong cache hay chưa
    const cached = await this.client.get(key);
    if (cached !== null) {
      try {
        // 2. Nếu có, giải mã JSON và trả về ngay lập tức để tiết kiệm tài nguyên
        return JSON.parse(cached) as T;
      } catch (error) {
        // Xử lý trường hợp dữ liệu cache bị hỏng (corrupted)
        this.logger.warn(
          `Lỗi giải mã cache Redis cho khóa "${key}": ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.client.del(key);
      }
    }

    // 3. Nếu không có cache, thực hiện gọi hàm factory (thường là truy vấn DB) để lấy dữ liệu mới
    const data = await factory();

    // 4. Lưu dữ liệu mới vào cache kèm thời gian sống (TTL) để sử dụng cho các lần sau
    await this.client.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  }

  // Xóa một hoặc nhiều khóa khỏi Redis.
  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.del(...keys);
  }

  // Xóa tất cả các khóa khớp với pattern (glob pattern) sử dụng lệnh SCAN.
  // Sử dụng SCAN thay vì KEYS để không gây treo (block) Redis server khi số lượng key lớn.
  async deleteByPattern(pattern: string): Promise<void> {
    // 1. Tạo luồng quét dữ liệu (scan stream) với kích thước mỗi đợt quét là 100 keys
    const stream = this.client.scanStream({ match: pattern, count: 100 });

    // 2. Duyệt qua từng nhóm kết quả trả về từ stream
    for await (const keys of stream) {
      if ((keys as string[]).length > 0) {
        // 3. Thực hiện xóa hàng loạt các khóa tìm thấy trong đợt quét hiện tại
        await this.client.del(...(keys as string[]));
      }
    }
  }

  // Xây dựng tùy chọn kết nối dựa trên các biến môi trường cấu hình trong hệ thống.
  private buildOptions(): RedisOptions {
    return {
      host: this.config.get<string>('REDIS_HOST', '127.0.0.1'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      username: this.config.get<string>('REDIS_USERNAME') || undefined,
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      db: this.config.get<number>('REDIS_DB', 0),
      lazyConnect: true,
      maxRetriesPerRequest: null,
    };
  }
}
