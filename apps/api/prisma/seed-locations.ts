import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '../generated/prisma/client';

type GhnWard = {
  WardCode: string;
  WardName: string;
};

type GhnDistrict = {
  DistrictID: number;
  DistrictName: string;
  Wards?: GhnWard[];
};

type GhnProvince = {
  ProvinceID: number;
  ProvinceName: string;
  Districts?: GhnDistrict[];
};

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });
const BATCH_SIZE = 1000;

function chunked<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function seedLocations() {
  const filePath = resolve(process.cwd(), 'prisma/data/locations.json');
  const raw = await readFile(filePath, 'utf-8');
  const provinces = JSON.parse(raw) as GhnProvince[];

  const cityRows = provinces.map((p) => ({
    giaohangnhanhId: String(p.ProvinceID),
    name: p.ProvinceName,
  }));

  for (const batch of chunked(cityRows, BATCH_SIZE)) {
    await prisma.city.createMany({ data: batch, skipDuplicates: true });
  }

  const cities = await prisma.city.findMany({
    select: { id: true, giaohangnhanhId: true },
  });
  const cityIdByGhnId = new Map(cities.map((c) => [c.giaohangnhanhId, c.id]));

  const districtRows: { giaohangnhanhId: string; name: string; cityId: number }[] = [];
  for (const province of provinces) {
    const cityId = cityIdByGhnId.get(String(province.ProvinceID));
    if (!cityId || !province.Districts) continue;

    for (const district of province.Districts) {
      districtRows.push({
        giaohangnhanhId: String(district.DistrictID),
        name: district.DistrictName,
        cityId,
      });
    }
  }

  for (const batch of chunked(districtRows, BATCH_SIZE)) {
    await prisma.district.createMany({ data: batch, skipDuplicates: true });
  }

  const districts = await prisma.district.findMany({
    select: { id: true, giaohangnhanhId: true },
  });
  const districtIdByGhnId = new Map(districts.map((d) => [d.giaohangnhanhId, d.id]));

  const wardRows: { giaohangnhanhId: string; name: string; districtId: number }[] = [];
  for (const province of provinces) {
    if (!province.Districts) continue;
    for (const district of province.Districts) {
      const districtId = districtIdByGhnId.get(String(district.DistrictID));
      if (!districtId || !district.Wards) continue;

      for (const ward of district.Wards) {
        wardRows.push({
          giaohangnhanhId: String(ward.WardCode),
          name: ward.WardName,
          districtId,
        });
      }
    }
  }

  for (const batch of chunked(wardRows, BATCH_SIZE)) {
    await prisma.ward.createMany({ data: batch, skipDuplicates: true });
  }

  const [cityCount, districtCount, wardCount] = await Promise.all([
    prisma.city.count(),
    prisma.district.count(),
    prisma.ward.count(),
  ]);

  console.log(
    `Seed locations done: cities=${cityCount}, districts=${districtCount}, wards=${wardCount}`,
  );
}
