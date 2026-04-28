import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/services/prisma.service';

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

describe('Authentication Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Password123!',
    fullName: 'Test E2E User',
    phoneNumber: `09${Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0')}`,
  };

  let accessToken: string;
  let refreshTokenCookie: string;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();

      app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
      });

      app.useGlobalPipes(new ValidationPipe({ transform: true }));
      app.use(cookieParser());

      await app.init();

      prisma = app.get<PrismaService>(PrismaService);
    } catch (error) {
      console.error('Initialization failed', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    if (prisma) {
      try {
        await prisma.customer.deleteMany({
          where: { email: testUser.email },
        });
        await prisma.$disconnect();
      } catch (err) {
        console.error('Prisma cleanup failed', err);
      }
    }

    if (app) {
      await app.close();
    }
  }, 10000);

  describe('Registration & Verification', () => {
    it('should register a new customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(testUser)
        .expect(201);

      const body = response.body as ApiResponse<{ email: string }>;
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(testUser.email);
    });

    it('should verify registration in DB', async () => {
      await prisma.customer.update({
        where: { email: testUser.email },
        data: { emailVerifiedAt: new Date(), isActive: true },
      });
    });
  });

  describe('Login & Session Management', () => {
    it('should login successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const body = response.body as ApiResponse<{ accessToken: string }>;
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect((body.data as any).refreshToken).toBeDefined();
      accessToken = body.data.accessToken;
      refreshTokenCookie = (body.data as any).refreshToken;
    });

    it('should get current profile with access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as ApiResponse<{ email: string }>;
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(testUser.email);
    });

    it('should refresh tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('x-refresh-token', refreshTokenCookie)
        .expect(200);

      const body = response.body as ApiResponse<{ accessToken: string }>;
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      accessToken = body.data.accessToken;
    });

    it('should logout', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-refresh-token', refreshTokenCookie)
        .expect(204);

      await request(app.getHttpServer())
        .get('/v1/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
