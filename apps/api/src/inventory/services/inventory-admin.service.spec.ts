import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryMovementType, InventoryVoucherType } from '../../../generated/prisma/client';
import { InventoryRepository } from '../repositories/inventory.repository';
import { InventoryAdminService } from './inventory-admin.service';

describe('InventoryAdminService', () => {
  let service: InventoryAdminService;
  let repository: jest.Mocked<InventoryRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryAdminService,
        {
          provide: InventoryRepository,
          useValue: {
            findProductsForLowStockPanel: jest.fn(),
            findVariantsForInventoryList: jest.fn(),
            countInventoryMovements: jest.fn(),
            findInventoryMovementsPage: jest.fn(),
            createVoucherWithLinesAndMovements: jest.fn(),
            countInventoryVouchers: jest.fn(),
            findInventoryVouchersPage: jest.fn(),
            findInventoryVoucherDetailById: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(InventoryAdminService);
    repository = module.get(InventoryRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build low stock panel with pagination', async () => {
    repository.findProductsForLowStockPanel.mockResolvedValue([
      {
        id: 1,
        name: 'Product A',
        images: [{ url: 'https://image-a' }],
        variants: [
          { sku: 'A-01', onHand: 2, reserved: 1, color: { name: 'Red' }, size: { label: 'M' } },
        ],
      },
      {
        id: 2,
        name: 'Product B',
        images: [],
        variants: [{ sku: 'B-01', onHand: 0, reserved: 0, color: null, size: null }],
      },
    ] as any);
    const result = await service.getLowStockProducts({
      page: 1,
      limit: 1,
      includeOutOfStock: true,
    });
    expect(result.meta.total).toBe(2);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].statusLabel).toBe('out_of_stock');
  });

  it('should list inventory variants and filter by status', async () => {
    repository.findVariantsForInventoryList.mockResolvedValue([
      {
        id: 11,
        productId: 1,
        sku: 'SKU-1',
        onHand: 15,
        reserved: 2,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        colorId: null,
        color: null,
        size: null,
        product: { name: 'AAA', images: [] },
      },
      {
        id: 12,
        productId: 2,
        sku: 'SKU-2',
        onHand: 0,
        reserved: 0,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        colorId: null,
        color: null,
        size: null,
        product: { name: 'BBB', images: [] },
      },
    ] as any);
    const result = await service.listInventory({
      status: 'out_of_stock',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
    expect(result.meta.total).toBe(1);
    expect(result.data[0].sku).toBe('SKU-2');
    expect(result.data[0].status).toBe('out_of_stock');
  });

  it('should list movements with mapped employee and voucher data', async () => {
    repository.countInventoryMovements.mockResolvedValue(1);
    repository.findInventoryMovementsPage.mockResolvedValue([
      {
        id: 1,
        variantId: 5,
        type: InventoryMovementType.IMPORT,
        delta: 10,
        onHandAfter: 10,
        reservedAfter: 0,
        createdAt: new Date(),
        voucherId: 9,
        voucher: { code: 'PN001' },
        employee: { fullName: 'Admin' },
        variant: { sku: 'SKU-1', product: { name: 'Product A' } },
      },
    ] as any);
    const result = await service.listInventoryMovements({ type: InventoryMovementType.IMPORT });
    expect(result.meta.total).toBe(1);
    expect(result.data[0].voucherCode).toBe('PN001');
    expect(result.data[0].employeeName).toBe('Admin');
  });

  it('should validate voucher input and throw when items are empty', async () => {
    await expect(
      service.createInventoryVoucher({ code: ' PN001 ', type: 'IMPORT', items: [] }, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create inventory voucher and map output', async () => {
    repository.createVoucherWithLinesAndMovements.mockResolvedValue({
      id: 1,
      code: 'PN001',
      type: InventoryVoucherType.IMPORT,
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      totalQuantity: 2,
      totalAmount: 50000,
      note: null,
      createdByEmployee: { fullName: 'Admin A' },
      items: [
        {
          id: 101,
          variantId: 6,
          quantity: 2,
          unitPrice: 25000,
          lineAmount: 50000,
          variant: { sku: 'SKU-6', product: { name: 'Product X' } },
        },
      ],
    } as any);
    const result = await service.createInventoryVoucher(
      {
        code: ' PN001 ',
        type: 'IMPORT',
        note: '  note ',
        items: [{ variantId: 6, quantity: 2, unitPrice: 25000 }],
      },
      5,
    );
    expect(result.code).toBe('PN001');
    expect(result.items[0].productName).toBe('Product X');
    expect(repository.createVoucherWithLinesAndMovements).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 5, code: 'PN001' }),
    );
  });

  it('should validate duplicate SKU and invalid quantity/unit price', async () => {
    await expect(
      service.createInventoryVoucher(
        {
          code: 'PN-ERR',
          type: 'IMPORT',
          items: [{ variantId: 6, quantity: 0, unitPrice: 1 }],
        },
        5,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createInventoryVoucher(
        {
          code: 'PN-ERR',
          type: 'IMPORT',
          items: [{ variantId: 6, quantity: 1, unitPrice: -1 }],
        },
        5,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createInventoryVoucher(
        {
          code: 'PN-ERR',
          type: 'IMPORT',
          items: [
            { variantId: 6, quantity: 1, unitPrice: 1 },
            { variantId: 6, quantity: 2, unitPrice: 1 },
          ],
        },
        5,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should validate empty voucher code', async () => {
    await expect(
      service.createInventoryVoucher(
        {
          code: '   ',
          type: 'IMPORT',
          items: [{ variantId: 6, quantity: 1, unitPrice: 1 }],
        },
        5,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should list vouchers with pagination', async () => {
    repository.countInventoryVouchers.mockResolvedValue(1);
    repository.findInventoryVouchersPage.mockResolvedValue([
      {
        id: 1,
        code: 'PN001',
        type: InventoryVoucherType.IMPORT,
        issuedAt: new Date(),
        totalQuantity: 1,
        totalAmount: 10000,
        note: null,
        createdAt: new Date(),
        createdByEmployee: { fullName: 'Admin' },
      },
    ] as any);
    const result = await service.listInventoryVouchers({ type: InventoryVoucherType.IMPORT });
    expect(result.meta.total).toBe(1);
    expect(result.data[0].code).toBe('PN001');
  });

  it('should return voucher detail and throw when missing', async () => {
    repository.findInventoryVoucherDetailById.mockResolvedValueOnce({
      id: 1,
      code: 'PN001',
      type: InventoryVoucherType.IMPORT,
      issuedAt: new Date(),
      totalQuantity: 1,
      totalAmount: 10000,
      note: null,
      createdByEmployee: { fullName: 'Admin' },
      items: [
        {
          id: 1,
          variantId: 10,
          quantity: 1,
          unitPrice: 10000,
          lineAmount: 10000,
          variant: { sku: 'SKU-10', product: { name: 'Product 10' } },
        },
      ],
    } as any);
    const detail = await service.getInventoryVoucherDetail(1);
    expect(detail.items[0].sku).toBe('SKU-10');
    repository.findInventoryVoucherDetailById.mockResolvedValueOnce(null);
    await expect(service.getInventoryVoucherDetail(999)).rejects.toThrow(NotFoundException);
  });

  it('should sort inventory by explicit fields', async () => {
    repository.findVariantsForInventoryList.mockResolvedValue([
      {
        id: 21,
        productId: 3,
        sku: 'SKU-B',
        onHand: 10,
        reserved: 7,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        colorId: null,
        color: null,
        size: null,
        product: { name: 'B Product', images: [] },
      },
      {
        id: 22,
        productId: 4,
        sku: 'SKU-A',
        onHand: 5,
        reserved: 1,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        colorId: null,
        color: null,
        size: null,
        product: { name: 'A Product', images: [] },
      },
    ] as any);
    const byProduct = await service.listInventory({ sortBy: 'productName', sortOrder: 'asc' });
    expect(byProduct.data[0].productName).toBe('A Product');
    const bySku = await service.listInventory({ sortBy: 'sku', sortOrder: 'asc' });
    expect(bySku.data[0].sku).toBe('SKU-A');
    const byAvailable = await service.listInventory({ sortBy: 'available', sortOrder: 'desc' });
    expect(byAvailable.data[0].available).toBeGreaterThanOrEqual(byAvailable.data[1].available);
  });
});
