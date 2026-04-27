import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/services/prisma.service';
import { GhnService } from '../src/shipping/services/ghn.service';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface LoginResponse {
  accessToken: string;
}

interface CartItem {
  id: number;
  quantity: number;
}

interface CartResponse {
  items: CartItem[];
}

interface OrderResponse {
  orderCode: string;
}

describe('Order Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let customerToken: string;
  let customerId: number;
  let variantId: number;
  let addressId: number;
  let orderCode: string;

  const testEmail = `order-test-${Date.now()}@example.com`;

  const mockGhnService = {
    getAvailableServices: jest.fn().mockResolvedValue([{ service_type_id: 2, service_id: 123 }]),
    calculateFee: jest.fn().mockResolvedValue({ total: 30000 }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GhnService)
      .useValue(mockGhnService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // 1. Create a customer and login
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const customer = await prisma.customer.create({
      data: {
        email: testEmail,
        hashedPassword,
        fullName: 'Order E2E Customer',
        phoneNumber: `08${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, '0')}`,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });
    customerId = customer.id;

    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: testEmail, password: 'Password123!' });
    const loginBody = loginRes.body as ApiResponse<LoginResponse>;
    customerToken = loginBody.data.accessToken;

    // 2. Setup Catalog Data
    const category = await prisma.category.upsert({
      where: { slug: 'e2e-category-slug' },
      update: {},
      create: { name: 'E2E Category', slug: 'e2e-category-slug' },
    });
    const color = await prisma.color.upsert({
      where: { name: 'E2E Red' },
      update: {},
      create: { name: 'E2E Red', hexCode: '#FF0000' },
    });
    const size = await prisma.size.upsert({
      where: { label: 'XL' },
      update: {},
      create: { label: 'XL' },
    });

    const product = await prisma.product.create({
      data: {
        name: 'E2E Test Product',
        slug: `e2e-prod-${Date.now()}`,
        isActive: true,
        variants: {
          create: {
            sku: `E2E-SKU-${Date.now()}`,
            price: 150000,
            onHand: 10,
            reserved: 0,
            colorId: color.id,
            sizeId: size.id,
          },
        },
      },
      include: { variants: true },
    });
    await prisma.productCategory.create({
      data: { productId: product.id, categoryId: category.id },
    });
    variantId = product.variants[0].id;

    // 3. Create Address
    const address = await prisma.address.create({
      data: {
        customerId,
        fullName: 'Test Recipient',
        phoneNumber: '0909090909',
        addressLine: '123 Street',
        cityId: 1,
        districtId: 1,
        wardId: 1,
        isDefault: true,
      },
    });
    addressId = address.id;
  }, 30000);

  afterAll(async () => {
    if (prisma) {
      await prisma.inventoryMovement.deleteMany({ where: { variantId } });
      await prisma.orderItem.deleteMany({ where: { variantId } });
      await prisma.orderStatusHistory.deleteMany({ where: { order: { customerId } } });
      await prisma.payment.deleteMany({ where: { order: { customerId } } });
      await prisma.order.deleteMany({ where: { customerId } });
      await prisma.address.deleteMany({ where: { customerId } });
      await prisma.cartItem.deleteMany({ where: { cart: { customerId } } });
      await prisma.cart.deleteMany({ where: { customerId } });
      await prisma.productVariant.deleteMany({ where: { id: variantId } });
      await prisma.product.deleteMany({ where: { name: 'E2E Test Product' } });
      await prisma.customer.deleteMany({ where: { id: customerId } });
      await prisma.$disconnect();
    }
    if (app) await app.close();
  }, 10000);

  describe('Order Creation Flow', () => {
    it('should add product to cart', async () => {
      await request(app.getHttpServer())
        .post('/v1/me/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId, quantity: 2 })
        .expect(201);

      const cartRes = await request(app.getHttpServer())
        .get('/v1/me/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const cartBody = cartRes.body as ApiResponse<CartResponse>;
      expect(cartBody.data.items).toHaveLength(1);
      expect(cartBody.data.items[0]?.quantity).toBe(2);
    });

    it('should place an order', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/me/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          addressId,
          paymentMethod: 'COD',
          serviceTypeId: 2,
          requiredNote: 'KHONGCHOXEMHANG',
        });

      const orderBody = response.body as ApiResponse<OrderResponse>;
      expect(response.status).toBe(201);
      expect(orderBody.success).toBe(true);
      expect(orderBody.data.orderCode).toBeDefined();
      orderCode = orderBody.data.orderCode;

      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      expect(variant?.reserved).toBe(2);
    });

    it('should cancel the order and release stock', async () => {
      await request(app.getHttpServer())
        .post(`/v1/me/orders/${orderCode}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      expect(variant?.reserved).toBe(0);
    });
  });
});
