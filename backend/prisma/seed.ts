import { PrismaClient } from '@prisma/client';
import { POI_CATALOG } from './poi-data';

const prisma = new PrismaClient();

// Полный набор категорий — цвета соответствуют комментариям в poi-data.ts
const CATEGORIES = [
  { code: 'lake', title: 'Озеро', colorHex: '#2196F3', iconAsset: '/assets/poi-markers/12.png' },
  { code: 'mountain', title: 'Гора', colorHex: '#795548', iconAsset: '/assets/poi-markers/2.png' },
  { code: 'river', title: 'Река', colorHex: '#00897B', iconAsset: '/assets/poi-markers/10.png' },
  { code: 'spring', title: 'Родник', colorHex: '#00BCD4', iconAsset: '/assets/poi-markers/7.png' },
  { code: 'cave', title: 'Пещера', colorHex: '#607D8B', iconAsset: '/assets/poi-markers/5.png' },
  { code: 'rare', title: 'Редкое место', colorHex: '#9C27B0', iconAsset: '/assets/poi-markers/13.png' },
  { code: 'museum', title: 'Музей', colorHex: '#8BC34A', iconAsset: '/assets/poi-markers/14.png' },
  { code: 'historic', title: 'Историческое место', colorHex: '#FBC02D', iconAsset: '/assets/poi-markers/14.png' },
  { code: 'monument', title: 'Памятник/достопримечательность', colorHex: '#FF9800', iconAsset: '/assets/poi-markers/8.png' },
  { code: 'park', title: 'Парк', colorHex: '#4CAF50', iconAsset: '/assets/poi-markers/4.png' },
  { code: 'secret', title: 'Секретное место', colorHex: '#212121', iconAsset: '/assets/poi-markers/6.png' },
  { code: 'waterfall', title: 'Водопад', colorHex: '#00ACC1', iconAsset: '/assets/poi-markers/10.png' },
  { code: 'village', title: 'Деревня', colorHex: '#4CAF50', iconAsset: '/assets/poi-markers/11.png' },
  { code: 'abandoned', title: 'Заброшенный объект', colorHex: '#455A64', iconAsset: '/assets/poi-markers/3.png' },
];

const CATEGORY_REWARDS: Record<string, number> = { lake: 300, mountain: 1000, river: 400, spring: 300, cave: 500, rare: 700, museum: 300, historic: 300, monument: 300, park: 200, secret: 0, waterfall: 400, village: 100, abandoned: 500 };
const CATEGORY_MARKERS: Record<string, number> = { lake: 12, mountain: 2, river: 10, spring: 7, cave: 5, rare: 13, museum: 14, historic: 14, monument: 8, park: 4, secret: 6, waterfall: 10, village: 11, abandoned: 3 };

async function main() {
  const categoryMap: Record<string, string> = {};

  for (const c of CATEGORIES) {
    const created = await prisma.poiCategory.upsert({
      where: { code: c.code },
      update: { title: c.title, colorHex: c.colorHex, iconAsset: c.iconAsset },
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

    const isCity = poi.categoryCode === 'historic' && poi.geofenceRadiusM >= 2500;
    const reward = isCity ? 100 : CATEGORY_REWARDS[poi.categoryCode] ?? poi.baseXp;
    const data = {
      categoryId,
      markerAsset: `/assets/poi-markers/${isCity ? 1 : (CATEGORY_MARKERS[poi.categoryCode] ?? 3)}.png`,
      lat: poi.lat,
      lng: poi.lng,
      geofenceRadiusM: poi.geofenceRadiusM,
      descriptionHistory: poi.descriptionHistory,
      interestingFacts: poi.interestingFacts,
      bestSeason: poi.bestSeason,
      difficulty: poi.difficulty,
      baseXp: reward,
      baseCoins: reward,
      requiresProof: poi.requiresProof,
      ...(poi.visibility ? { visibility: poi.visibility } : {}),
    };

    const existing = await prisma.poi.findFirst({ where: { title: poi.title } });

    if (existing?.createdBy === 'admin-tool') {
      // Настройки, изменённые через панель администратора, принадлежат базе
      // и не должны затираться при очередном запуске seed.
      continue;
    } else if (existing) {
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

  // Кристаллы больше не заполняются вручную из файла — они появляются сами,
  // по чанкам, когда игрок оказывается рядом (см. CrystalsService).

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
    `Seed завершён: ${CATEGORIES.length} категорий, ${created} новых точек создано, ${updated} обновлено, ${deleted} устаревших удалено, предметы магазина загружены.`,
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
