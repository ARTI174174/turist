import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { code: 'lake', title: 'Озеро', colorHex: '#2196F3' },
    { code: 'mountain', title: 'Гора', colorHex: '#795548' },
    { code: 'historic', title: 'Историческое место', colorHex: '#FBC02D' },
    { code: 'rare', title: 'Редкое место', colorHex: '#9C27B0' },
    { code: 'secret', title: 'Секретное место', colorHex: '#212121' },
    { code: 'cave', title: 'Пещера', colorHex: '#607D8B' },
    { code: 'waterfall', title: 'Водопад', colorHex: '#00BCD4' },
    { code: 'museum', title: 'Музей', colorHex: '#8BC34A' },
    { code: 'monument', title: 'Памятник', colorHex: '#FF9800' },
    { code: 'village', title: 'Деревня', colorHex: '#4CAF50' },
    { code: 'abandoned', title: 'Заброшенный объект', colorHex: '#455A64' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const c of categories) {
    const created = await prisma.poiCategory.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
    categoryMap[c.code] = created.id;
  }

  const pois = [
    {
      title: 'Аркаим',
      categoryId: categoryMap['historic'],
      lat: 52.6403,
      lng: 59.5744,
      descriptionHistory:
        'Укреплённое поселение эпохи бронзы, один из памятников "Страны городов" Южного Урала.',
      interestingFacts: ['Открыт в 1987 году', 'Считается местом силы у эзотериков'],
      bestSeason: ['summer', 'autumn'],
      difficulty: 'easy',
      baseXp: 600,
      baseCoins: 2500,
      requiresProof: true,
    },
    {
      title: 'Национальный парк Таганай',
      categoryId: categoryMap['mountain'],
      lat: 55.2601,
      lng: 59.8321,
      descriptionHistory: 'Горный хребет, один из самых популярных туристических маршрутов Урала.',
      interestingFacts: ['Название переводится как "Подставка Луны"', 'Высота Круглицы — 1178 м'],
      bestSeason: ['summer', 'autumn', 'winter'],
      difficulty: 'medium',
      baseXp: 500,
      baseCoins: 2000,
    },
    {
      title: 'Озеро Зюраткуль',
      categoryId: categoryMap['lake'],
      lat: 54.9494,
      lng: 59.1789,
      descriptionHistory: 'Самое высокогорное озеро Урала, объект нацпарка "Зюраткуль".',
      interestingFacts: ['Высота над уровнем моря — 724 м', 'Рядом — гигантский геоглиф "Лось"'],
      bestSeason: ['summer', 'autumn'],
      difficulty: 'easy',
      baseXp: 400,
      baseCoins: 1500,
    },
    {
      title: 'Озеро Тургояк',
      categoryId: categoryMap['lake'],
      lat: 55.1544,
      lng: 60.0781,
      descriptionHistory: 'Одно из чистейших озёр России, сравнимое по прозрачности с Байкалом.',
      interestingFacts: ['На острове Веры найдены мегалиты', 'Глубина — до 34 метров'],
      bestSeason: ['summer'],
      difficulty: 'easy',
      baseXp: 300,
      baseCoins: 1200,
    },
  ];

  for (const poi of pois) {
    const exists = await prisma.poi.findFirst({ where: { title: poi.title } });
    if (!exists) {
      await prisma.poi.create({ data: poi as any });
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
  console.log('Seed завершён: категории, точки и предметы магазина загружены.');
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
