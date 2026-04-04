import { Injectable } from '@nestjs/common';
import type { Customer } from 'generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateCustomerData {
  fullName: string;
  email: string;
  phoneNumber: string;
  hashedPassword: string;
  dob: Date | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  isActive?: boolean;
}

interface CustomerAuthView {
  id: number;
  email: string;
  fullName: string;
  hashedPassword: string;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  deletedAt: Date | null;
}

interface CustomerValidationView {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  deletedAt: Date | null;
}

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<CustomerAuthView | null> {
    return this.prisma.customer.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        hashedPassword: true,
        isActive: true,
        emailVerifiedAt: true,
        deletedAt: true,
      },
    });
  }

  async findById(id: number): Promise<CustomerValidationView | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        deletedAt: true,
      },
    });
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!customer;
  }

  async existsByPhone(phoneNumber: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { phoneNumber },
      select: { id: true },
    });
    return !!customer;
  }

  async findHashedPasswordById(id: number): Promise<string | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: { hashedPassword: true },
    });
    return customer?.hashedPassword ?? null;
  }

  async updatePassword(id: number, hashedPassword: string): Promise<boolean> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data: { hashedPassword },
    });
    return count === 1;
  }

  async activateEmailById(id: number): Promise<boolean> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id, deletedAt: null },
      data: { isActive: true, emailVerifiedAt: new Date() },
    });
    return count === 1;
  }
}
