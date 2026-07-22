import { PrismaClient } from '@prisma/client';
import { POI_CATALOG } from './poi-data';
import { CRYSTAL_CATALOG } from './crystal-data';

const prisma = new PrismaClient();

// Полный набор категорий — цвета соответствуют комментариям в poi-data.ts
const CATEGORIES = [
  { code: 'lake', title: 'Озеро', colorHex: '#2196F3' },
  { code: 'mountain', title: 'Гора', colorHex: '#795548' },
  { code: 'river', title: 'Река', colorHex: '#00897B' },
  { code: 'spring', title: 'Родник', colorHex: '#00BCD4' },
  { code: 'cave', title: 'Пещера', colorHex: '#607D8B' },
  { code: 'rare', title: 'Редкое место', colorHex: '#9C27B0' },
  { code: 'museum', title: 'Музей', colorHex: '#8BC34A' },
  { code: 'historic', title: 'Историческое место', colorHex: '#FBC02D' },
  { code: 'monument', title: 'Памятник/достопримечательность', colorHex: '#FF9800' },
  { code: 'park', title: 'Парк', colorHex: '#4CAF50' },
  { code: 'secret', title: 'Секретное место', colorHex: '#212121' },
  { code: 'waterfall', title: 'Водопад', colorHex: '#00ACC1' },
  { code: 'village', title: 'Деревня', colorHex: '#4CAF50' },
  { code: 'abandoned', title: 'Заброшенный объект', colorHex: '#455A64' },
];

async function main() {
  const categoryMap: Record<string, string> = {};

  for (const c of CATEGORIES) {
    const created = await prisma.poiCategory.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
    categoryMap[c.code] = created.id;
  }

  let created = 0;
  let updated = 0;

  for (const poi of POI_CATALOG) {
    const categoryId = categoryMap[poi.categoryCode];
    if (!categoryId) {
      // eslint-disable-next-line no-console
      console.warn(`Пропущена точка "${poi.title}": неизвестная категория "${poi.categoryCode}"`);
      continue;
    }

    const data = {
      categoryId,
      lat: poi.lat,
      lng: poi.lng,
      geofenceRadiusM: poi.geofenceRadiusM,
      descriptionHistory: poi.descriptionHistory,
      interestingFacts: poi.interestingFacts,
      bestSeason: poi.bestSeason,
      difficulty: poi.difficulty,
      baseXp: poi.baseXp,
      baseCoins: poi.baseXp, // монеты за визит всегда равны баллам опыта (правило игры)
      requiresProof: poi.requiresProof,
    };

    const existing = await prisma.poi.findFirst({ where: { title: poi.title } });

    if (existing) {
      // Точка уже была — обновляем координаты/описание, если их поправили в poi-data.ts
      await prisma.poi.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.poi.create({ data: { title: poi.title, ...data } });
      created++;
    }
  }

  // ----------------------------------------------------------
  // Синхронизация: если точку удалили из poi-data.ts — она должна
  // пропасть и из базы/с карты, а не просто перестать обновляться.
  // ----------------------------------------------------------
  const catalogTitles = POI_CATALOG.map((p) => p.title);
  const staleePois = await prisma.poi.findMany({
    where: { title: { notIn: catalogTitles }, createdBy: null },
    select: { id: true },
  });
  const staleIds = staleePois.map((p) => p.id);

  let deleted = 0;
  if (staleIds.length > 0) {
    // Сначала связанные записи без каскадного удаления в схеме
    await prisma.visit.deleteMany({ where: { poiId: { in: staleIds } } });
    await prisma.visitAttempt.deleteMany({ where: { poiId: { in: staleIds } } });
    await prisma.routeStop.deleteMany({ where: { poiId: { in: staleIds } } });
    const result = await prisma.poi.deleteMany({ where: { id: { in: staleIds } } });
    deleted = result.count;
  }

  let crystalsCreated = 0;
  for (const c of CRYSTAL_CATALOG) {
    const exists = await prisma.crystal.findFirst({ where: { lat: c.lat, lng: c.lng } });
    if (!exists) {
      await prisma.crystal.create({ data: c });
      crystalsCreated++;
    }
  }

  const shopItems = [
    { name: 'Тёплая куртка "Урал"', category: 'clothing', priceCoins: 3000, rarity: 'common' },
    { name: 'Рюкзак "Следопыт"', category: 'backpack', priceCoins: 4500, rarity: 'common' },
    { name: 'Ушанка "Легенда Урала"', category: 'headwear', priceCoins: 12000, rarity: 'rare' },
    { name: 'Питомец: Уральский лис', category: 'pet', priceCrystals: 500, rarity: 'epic' },
  ];

  for (const item of shopItems) {
    const exists = await prisma.shopItem.findFirst({ where: { name: item.name } });
    if (!exists) {
      await prisma.shopItem.create({ data: item as any });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed завершён: ${CATEGORIES.length} категорий, ${created} новых точек создано, ${updated} обновлено, ${deleted} устаревших удалено, ${crystalsCreated} новых кристаллов, предметы магазина загружены.`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
