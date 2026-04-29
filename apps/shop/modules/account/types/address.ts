export type AddressType = 'HOME' | 'OFFICE';

export interface AddressLocationItem {
  id: number;
  name: string;
}

export interface CustomerAddress {
  id: number;
  fullName: string;
  phoneNumber: string;
  addressLine: string;
  type: AddressType;
  isDefault: boolean;
  city: AddressLocationItem;
  district: AddressLocationItem;
  ward: AddressLocationItem;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCustomerAddressPayload {
  fullName: string;
  phoneNumber: string;
  cityId: number;
  districtId: number;
  wardId: number;
  addressLine: string;
  type?: AddressType;
  isDefault?: boolean;
}

export interface UpdateCustomerAddressPayload {
  fullName?: string;
  phoneNumber?: string;
  cityId?: number;
  districtId?: number;
  wardId?: number;
  addressLine?: string;
  type?: AddressType;
  isDefault?: boolean;
}
