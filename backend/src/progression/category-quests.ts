export const CATEGORY_QUESTS = [
  { code: 'photographer-light', title: 'Путь фотографа · Лайт', description: 'Исследовать 5 фототочек', target: 5, categories: ['photo'], coins: 2000, crystals: 5 },
  { code: 'photographer-pro', title: 'Путь фотографа · Профи', description: 'Исследовать 20 фототочек', target: 20, categories: ['photo'], coins: 10000, crystals: 20 },
  { code: 'historian-light', title: 'Историк · Лайт', description: 'Исследовать 5 памятников и музеев суммарно', target: 5, categories: ['monument', 'museum'], coins: 2000, crystals: 5 },
  { code: 'historian-pro', title: 'Историк · Про', description: 'Исследовать 20 памятников и музеев суммарно', target: 20, categories: ['monument', 'museum'], coins: 10000, crystals: 20 },
  { code: 'lakes-light', title: 'Изучить озёра · Лайт', description: 'Исследовать 5 озёр', target: 5, categories: ['lake'], coins: 2000, crystals: 5 },
  { code: 'lakes-pro', title: 'Изучить озёра · Про', description: 'Исследовать 20 озёр', target: 20, categories: ['lake'], coins: 10000, crystals: 20 },
  { code: 'cities-five', title: 'Изучить 5 городов', description: 'Исследовать 5 городов', target: 5, categories: ['city'], coins: 1000, crystals: 5 },
  { code: 'cities-ten', title: 'Изучить 10 городов', description: 'Исследовать 10 городов', target: 10, categories: ['city'], coins: 10000, crystals: 20 },
] as const;

export function countQuestVisits(categories: readonly string[], visitedCategories: string[]) {
  return visitedCategories.filter((category) => !categories.length || categories.includes(category)).length;
}
