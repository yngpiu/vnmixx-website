import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { PrismaClient } from 'generated/prisma/client';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Helper to extract numbers from price strings like "695.000đ"
const parsePrice = (priceStr: string | null | undefined): number => {
  if (!priceStr) return 0;
  const numStr = priceStr.replace(/[^0-9]/g, '');
  return numStr ? parseInt(numStr, 10) : 0;
};

// Generate random SKU
const generateSku = () => {
  return 'IVY-NU-' + crypto.randomBytes(4).toString('hex').toUpperCase();
};

async function main() {
  console.log('🔄 Đang dọn dẹp dữ liệu cũ...');
  // Delete existing products (Cleanup children explicitly to handle DB constraints)
  await prisma.productImage.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productAttribute.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  // Delete base attributes just in case
  await prisma.size.deleteMany({});
  await prisma.color.deleteMany({});
  await prisma.attributeValue.deleteMany({});
  await prisma.attribute.deleteMany({});

  console.log('✅ Dọn dẹp thành công.');

  // 1. Tạo Colors
  console.log('✨ Khởi tạo Colors, Sizes và Attributes...');
  const colorsData = [
    { name: 'Trắng', hexCode: '#FFFFFF' },
    { name: 'Đen', hexCode: '#000000' },
    { name: 'Đỏ', hexCode: '#FF0000' },
    { name: 'Xanh Navy', hexCode: '#000080' },
    { name: 'Be', hexCode: '#F5F5DC' },
  ];
  const colors = await Promise.all(
    colorsData.map((c) =>
      prisma.color.upsert({
        where: { hexCode: c.hexCode },
        update: {},
        create: c,
      }),
    ),
  );

  // 2. Tạo Sizes
  const sizesData = ['S', 'M', 'L', 'XL', 'XXL'];
  const sizes = await Promise.all(
    sizesData.map((label, idx) =>
      prisma.size.upsert({
        where: { label },
        update: {},
        create: { label, sortOrder: idx },
      }),
    ),
  );

  // 2.5 Tạo Attributes
  const attrMaterial = await prisma.attribute.upsert({
    where: { name: 'Chất liệu' },
    update: {},
    create: { name: 'Chất liệu' },
  });

  const attrStyle = await prisma.attribute.upsert({
    where: { name: 'Kiểu dáng' },
    update: {},
    create: { name: 'Kiểu dáng' },
  });

  const materialValues = ['Cotton', 'Lụa', 'Polyester'];
  const styleValues = ['Suông', 'Ôm', 'Chữ A'];

  const materials = await Promise.all(
    materialValues.map((val) =>
      prisma.attributeValue.create({
        data: { attributeId: attrMaterial.id, value: val },
      }),
    ),
  );

  const styles = await Promise.all(
    styleValues.map((val) =>
      prisma.attributeValue.create({
        data: { attributeId: attrStyle.id, value: val },
      }),
    ),
  );

  // 3. Seed các danh mục (Categories) theo cấu trúc 3 cấp (L1 -> L2 -> L3) và crawl sản phẩm
  const categoryTree = [
    {
      l1: { name: 'Nữ', slug: 'nu' },
      l2: { name: 'Áo Nữ', slug: 'ao-nu' },
      l3: {
        name: 'Áo sơ mi',
        slug: 'ao-so-mi-nu',
        url: 'https://ivymoda.com/danh-muc/ao-so-mi-nu',
      },
    },
    {
      l1: { name: 'Nữ', slug: 'nu' },
      l2: { name: 'Váy Đầm', slug: 'vay-dam' },
      l3: { name: 'Đầm Nữ', slug: 'dam-nu', url: 'https://ivymoda.com/danh-muc/dam-nu' },
    },
    {
      l1: { name: 'Nam', slug: 'nam' },
      l2: { name: 'Áo Nam', slug: 'ao-nam' },
      l3: { name: 'Áo Thun', slug: 'ao-thun-nam', url: 'https://ivymoda.com/danh-muc/ao-thun-nam' },
    },
    {
      l1: { name: 'Nam', slug: 'nam' },
      l2: { name: 'Quần Nam', slug: 'quan-nam' },
      l3: {
        name: 'Quần Khaki',
        slug: 'quan-kaki-nam',
        url: 'https://ivymoda.com/danh-muc/quan-kaki-nam',
      },
    },
  ];

  let totalProductsCount = 0;

  for (const cat of categoryTree) {
    // Create or get Level 1
    const level1 = await prisma.category.upsert({
      where: { slug: cat.l1.slug },
      update: {},
      create: { name: cat.l1.name, slug: cat.l1.slug, isFeatured: true },
    });

    // Create or get Level 2
    const level2 = await prisma.category.upsert({
      where: { slug: cat.l2.slug },
      update: { parentId: level1.id },
      create: { name: cat.l2.name, slug: cat.l2.slug, parentId: level1.id },
    });

    // Create or get Level 3
    const level3 = await prisma.category.upsert({
      where: { slug: cat.l3.slug },
      update: { parentId: level2.id },
      create: { name: cat.l3.name, slug: cat.l3.slug, parentId: level2.id },
    });

    console.log(
      `\n🕷️ Đang Crawl dữ liệu danh mục: ${cat.l1.name} > ${cat.l2.name} > ${cat.l3.name}...`,
    );
    try {
      const { data: html } = await axios.get(cat.l3.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      const $ = cheerio.load(html);

      const crawledProducts: any[] = [];
      $('.product').each((idx, el) => {
        const productNode = $(el);
        const titleNode = productNode.find('h3.title-product a');
        const name = titleNode.text().trim();
        const link = titleNode.attr('href');

        let slug = link
          ? link.substring(link.lastIndexOf('/') + 1)
          : `product-${crypto.randomBytes(4).toString('hex')}`;

        const imgNode = productNode.find('img').first();
        const imageUrl = imgNode.attr('data-src') || imgNode.attr('src');

        const currentPriceStr = productNode.find('.price-product ins span').text().trim();
        const originalPriceStr = productNode.find('.price-product del span').text().trim();

        const currentPrice = parsePrice(currentPriceStr);
        const originalPrice = originalPriceStr ? parsePrice(originalPriceStr) : currentPrice;

        if (name && currentPrice > 0) {
          crawledProducts.push({
            name,
            slug,
            thumbnail: imageUrl,
            price: originalPrice,
            salePrice: currentPrice < originalPrice ? currentPrice : null,
          });
        }
      });

      console.log(
        `✅ Crawl được ${crawledProducts.length} sản phẩm hợp lệ từ ${cat.l3.name}. Bắt đầu Insert DB...`,
      );

      let count = 0;
      for (const cp of crawledProducts) {
        // Ignore if duplicated slug in the same category
        const existingProduct = await prisma.product.findUnique({ where: { slug: cp.slug } });
        if (existingProduct) {
          continue; // Skip conflict
        }

        const product = await prisma.product.create({
          data: {
            name: cp.name,
            slug: cp.slug,
            categoryId: level3.id,
            thumbnail: cp.thumbnail,
            description: `Sản phẩm ${cp.name} chính hãng.`,
            isActive: true,
          },
        });

        const randomColors = colors.sort(() => 0.5 - Math.random()).slice(0, 2);
        const randomSizes = sizes.sort(() => 0.5 - Math.random()).slice(0, 2);

        if (cp.thumbnail) {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              colorId: randomColors[0]?.id,
              url: cp.thumbnail,
              altText: cp.name,
              sortOrder: 0,
            },
          });
        }

        const randomMaterial = materials.sort(() => 0.5 - Math.random())[0];
        const randomStyle = styles.sort(() => 0.5 - Math.random())[0];

        if (randomMaterial && randomStyle) {
          await prisma.productAttribute.createMany({
            data: [
              { productId: product.id, attributeValueId: randomMaterial.id },
              { productId: product.id, attributeValueId: randomStyle.id },
            ],
          });
        }

        for (const c of randomColors) {
          for (const s of randomSizes) {
            await prisma.productVariant.create({
              data: {
                productId: product.id,
                colorId: c.id,
                sizeId: s.id,
                sku: generateSku(),
                price: cp.price,
                salePrice: cp.salePrice,
                stockQty: Math.floor(Math.random() * 50) + 1,
                isActive: true,
              },
            });
          }
        }
        count++;
      }
      totalProductsCount += count;
      console.log(`   Đã Insert thành công ${count} sản phẩm cho danh mục ${cat.l3.name}.`);
    } catch (error: any) {
      console.error(`❌ Lỗi khi crawl danh mục ${cat.l3.name}:`, error.message);
    }
  }

  console.log(
    `\n🎉 Seed thành công tổng cộng ${totalProductsCount} sản phẩm cùng Variants, Colors, và Sizes!`,
  );
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
