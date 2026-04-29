import { Injectable } from '@nestjs/common';
import { CustomerStatus, type Customer } from 'generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

interface CreateCustomerData {
  fullName: string;
  email: string;
  phoneNumber: string;
  hashedPassword: string;
  dob: Date | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  status?: CustomerStatus;
}

export interface CustomerAuthView {
  id: number;
  email: string;
  fullName: string;
  hashedPassword: string;
  status: CustomerStatus;
  emailVerifiedAt: Date | null;
  deletedAt: Date | null;
}

export interface CustomerValidationView {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  status: CustomerStatus;
  deletedAt: Date | null;
}

@Injectable()
/**
 * Repository xử lý các thao tác dữ liệu liên quan đến Khách hàng trong phạm vi xác thực.
 * Tập trung vào các truy vấn phục vụ Đăng nhập, Đăng ký, OTP và Quản lý mật khẩu.
 * Tương tác trực tiếp với bảng 'customer' trong Database.
 */
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tìm khách hàng theo email để phục vụ đăng nhập/xác thực. */
  async findByEmail(email: string): Promise<CustomerAuthView | null> {
    return this.prisma.customer.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        hashedPassword: true,
        status: true,
        emailVerifiedAt: true,
        deletedAt: true,
      },
    });
  }

  /** Tìm khách hàng theo số điện thoại để phục vụ đăng nhập. */
  async findByPhone(phoneNumber: string): Promise<CustomerAuthView | null> {
    return this.prisma.customer.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        email: true,
        fullName: true,
        hashedPassword: true,
        status: true,
        emailVerifiedAt: true,
        deletedAt: true,
      },
    });
  }

  /** Tìm thông tin cơ bản của khách hàng theo ID để kiểm tra tính hợp lệ của token. */
  async findById(id: number): Promise<CustomerValidationView | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        status: true,
        deletedAt: true,
      },
    });
  }

  /** Tạo mới bản ghi khách hàng (thường dùng trong luồng đăng ký). */
  async create(data: CreateCustomerData): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  /** Kiểm tra email đã tồn tại hay chưa. */
  async existsByEmail(email: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!customer;
  }

  /** Kiểm tra số điện thoại đã tồn tại hay chưa. */
  async existsByPhone(phoneNumber: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });
    return !!customer;
  }

  /** Lấy mật khẩu đã băm theo ID khách hàng. */
  async findHashedPasswordById(id: number): Promise<string | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: { hashedPassword: true },
    });
    return customer?.hashedPassword ?? null;
  }

  /** Cập nhật mật khẩu mới cho khách hàng. */
  async updatePassword(id: number, hashedPassword: string): Promise<boolean> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data: { hashedPassword },
    });
    return count === 1;
  }

  /** Kích hoạt trạng thái xác thực email và kích hoạt tài khoản. */
  async activateEmailById(id: number): Promise<boolean> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data: { status: CustomerStatus.ACTIVE, emailVerifiedAt: new Date() },
    });
    return count === 1;
  }
}
