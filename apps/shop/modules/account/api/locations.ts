import { apiClient } from '@/lib/axios';
import type { AddressLocationItem } from '@/modules/account/types/address';

export async function getLocationCities(): Promise<AddressLocationItem[]> {
  const { data } = await apiClient.get<AddressLocationItem[]>('/locations/cities');
  return data;
}

export async function getLocationDistrictsByCityId(cityId: number): Promise<AddressLocationItem[]> {
  const { data } = await apiClient.get<AddressLocationItem[]>(
    `/locations/cities/${cityId}/districts`,
  );
  return data;
}

export async function getLocationWardsByDistrictId(
  districtId: number,
): Promise<AddressLocationItem[]> {
  const { data } = await apiClient.get<AddressLocationItem[]>(
    `/locations/districts/${districtId}/wards`,
  );
  return data;
}
