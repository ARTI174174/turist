export type CollectibleRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CollectibleCategory = 'medal' | 'crystal' | 'key' | 'artifact' | 'compass';

export interface CollectibleDefinition {
  key: string;
  name: string;
  category: CollectibleCategory;
  rarity: CollectibleRarity;
  description: string;
  sellCoins: number;
  assetUrl: string;
  eligibleGroups: string[];
}

const urban = ['urban'];
const wild = ['wild'];
const sale: Record<CollectibleRarity, number> = { common: 100, uncommon: 300, rare: 700, epic: 1200, legendary: 2000 };
const item = (key: string, name: string, category: CollectibleCategory, rarity: CollectibleRarity, image: string, description: string, eligibleGroups = rarity === 'common' || rarity === 'uncommon' ? urban : wild): CollectibleDefinition => ({ key, name, category, rarity, assetUrl: `/assets/collectibles/${image}.webp`, description, sellCoins: sale[rarity], eligibleGroups });

const medals = [
  ['medal_traveler', 'Медаль путешественника', 'common', 'medal-a-1', 'Знак первых уверенных шагов по дорогам Урала.'],
  ['medal_mountain_conqueror', 'Медаль покорителя гор', 'common', 'medal-a-2', 'За внимание к горным тропам и вершинам.'],
  ['medal_forest_explorer', 'Медаль исследователя лесов', 'common', 'medal-a-3', 'Медаль с изображением уральского леса.'],
  ['medal_lake_keeper', 'Медаль хранителя озёр', 'common', 'medal-a-4', 'Напоминание о чистых озёрах Южного Урала.'],
  ['medal_adventurer', 'Медаль искателя приключений', 'uncommon', 'medal-a-5', 'За любопытство и готовность свернуть с привычного пути.'],
  ['medal_pioneer', 'Медаль первооткрывателя', 'uncommon', 'medal-b-1', 'Награда за исследовательский азарт.'],
  ['medal_night_tourist', 'Медаль ночного туриста', 'rare', 'medal-b-2', 'Редкая медаль для тех, кто видел горы под звёздами.'],
  ['medal_cave_explorer', 'Медаль исследователя пещер', 'rare', 'medal-b-3', 'За смелость перед тишиной подземных залов.'],
  ['medal_summit_conqueror', 'Медаль покорителя вершин', 'uncommon', 'medal-b-4', 'За путь вверх и терпение на подъёме.'],
  ['medal_forest_tracker', 'Медаль лесного следопыта', 'uncommon', 'medal-b-5', 'За внимательность к следам и тропам.'],
  ['medal_mountain_eagle', 'Медаль горного орла', 'rare', 'medal-c-1', 'Редкий знак тех, кто поднялся над облаками.'],
  ['medal_nature_guardian', 'Медаль хранителя природы', 'uncommon', 'medal-c-2', 'За бережное отношение к лесам, рекам и горам.'],
  ['medal_golden_compass', 'Медаль золотого компаса', 'epic', 'medal-c-3', 'Редкая награда за верный путь и умение не теряться.'],
  ['medal_ancient_traveler', 'Медаль древнего путешественника', 'rare', 'medal-c-4', 'Медаль в стиле старинной карты исследователя.'],
  ['medal_treasure_seeker', 'Медаль искателя сокровищ', 'uncommon', 'medal-c-5', 'За удачу и любовь к тайнам старых мест.'],
  ['medal_river_explorer', 'Медаль исследователя рек', 'rare', 'medal-d-1', 'За открытия у уральских рек и водопадов.'],
  ['medal_legendary_tourist', 'Медаль легендарного туриста', 'legendary', 'medal-d-2', 'Легендарный знак выдающегося путешественника.'],
  ['medal_ural_traveler', 'Медаль уральского путешественника', 'epic', 'medal-d-3', 'Украшена узором гор и рек Южного Урала.'],
  ['medal_great_expedition', 'Медаль великой экспедиции', 'legendary', 'medal-d-4', 'Редкий знак участника Великой экспедиции.'],
  ['medal_master_adventures', 'Медаль мастера приключений', 'epic', 'medal-d-5', 'Награда опытного мастера путешествий.'],
] as const;

const crystals = [
  ['crystal_quartz', 'Прозрачный горный хрусталь', 'common', 'crystal-a-1', 'Чистый прозрачный кварц с тёплым блеском.'],
  ['crystal_amethyst', 'Фиолетовый аметист', 'uncommon', 'crystal-a-2', 'Фиолетовая друзовая россыпь из глубины горы.'],
  ['crystal_blue', 'Голубой кристалл', 'common', 'crystal-a-3', 'Голубой минерал с холодным сиянием.'],
  ['crystal_emerald', 'Изумрудный кристалл', 'uncommon', 'crystal-a-4', 'Зелёный кристалл с яркими гранями.'],
  ['crystal_ruby', 'Красный рубиновый кристалл', 'rare', 'crystal-a-5', 'Насыщенный рубиновый кристалл с внутренним огнём.'],
  ['crystal_golden', 'Золотистый кристалл', 'rare', 'crystal-b-1', 'Медово-золотой кристалл с металлическими прожилками.'],
  ['crystal_obsidian', 'Чёрный обсидиановый кристалл', 'rare', 'crystal-b-2', 'Стеклянно-чёрный обсидиан с острыми гранями.'],
  ['crystal_pink', 'Розовый кристалл', 'epic', 'crystal-b-3', 'Редкий нежно-розовый кварц.'],
  ['crystal_ice', 'Ледяной кристалл', 'epic', 'crystal-b-4', 'Прозрачный кристалл с морозной структурой.'],
  ['crystal_rainbow', 'Радужный кристалл', 'legendary', 'crystal-b-5', 'Легендарный минерал с переливами всех цветов.'],
] as const;

const keys = [
  ['key_iron', 'Старый железный ключ', 'common', 'key-a-1', 'Потемневший ключ с потёртым железным зубцом.'],
  ['key_bronze', 'Бронзовый ключ', 'common', 'key-a-2', 'Тяжёлый бронзовый ключ с узорной головкой.'],
  ['key_silver', 'Серебряный ключ', 'uncommon', 'key-a-3', 'Серебряный ключ с холодным металлическим блеском.'],
  ['key_gold', 'Золотой ключ', 'uncommon', 'key-a-4', 'Изящный золотой ключ с солнечной головкой.'],
  ['key_ruby', 'Ключ с рубином', 'rare', 'key-a-5', 'Тёмный ключ с крупным красным рубином.'],
  ['key_emerald', 'Ключ с изумрудом', 'rare', 'key-b-1', 'Ключ с ярким зелёным камнем в оправе.'],
  ['key_expedition', 'Ключ древней экспедиции', 'rare', 'key-b-2', 'Старинный бронзовый ключ с картой экспедиции.'],
  ['key_mountain_temple', 'Ключ горного храма', 'epic', 'key-b-3', 'Ключ с резным силуэтом горного святилища.'],
  ['key_crystal', 'Кристальный ключ', 'epic', 'key-b-4', 'Полупрозрачный ключ из голубого кристалла.'],
  ['key_legendary', 'Легендарный светящийся ключ', 'legendary', 'key-b-5', 'Ключ с древним светящимся камнем.'],
] as const;

const artifacts = [
  ['artifact_golden_heart', 'Золотое сердце горы', 'rare', 'artifact-1', 'Тёмный камень с природными золотыми жилами.'],
  ['artifact_ruby_heart', 'Рубиновое сердце', 'epic', 'artifact-2', 'Расколотая порода с крупным красным рубином.'],
  ['artifact_diamond_geode', 'Алмазная жеода', 'legendary', 'artifact-3', 'Редкая жеода с большим бриллиантом в центре.'],
  ['artifact_glowing_stone', 'Светящийся камень', 'legendary', 'artifact-4', 'Древний камень с голубым светом в трещинах.'],
  ['artifact_five_elements', 'Камень пяти стихий', 'legendary', 'artifact-5', 'Артефакт с пятью кристаллами и золотыми прожилками.'],
] as const;

const compasses = [
  ['compass_old', 'Старый туристический компас', 'common', 'compass-a-1', 'Потёртый компас, переживший множество походов.'],
  ['compass_military', 'Военный металлический компас', 'common', 'compass-a-2', 'Надёжный прибор в прочном металлическом корпусе.'],
  ['compass_wooden', 'Деревянный компас путешественника', 'uncommon', 'compass-a-3', 'Тёплый деревянный корпус с резным рисунком леса.'],
  ['compass_bronze', 'Бронзовый карманный компас', 'uncommon', 'compass-a-4', 'Карманный компас с бронзовым ободком.'],
  ['compass_silver', 'Серебряный компас', 'rare', 'compass-a-5', 'Тонкая серебряная работа и синяя стрелка.'],
  ['compass_gold', 'Золотой компас', 'rare', 'compass-b-1', 'Компактный золотой компас с солнечной розой.'],
  ['compass_marine', 'Морской компас', 'rare', 'compass-b-2', 'Компас с волнами и глубоким синим циферблатом.'],
  ['compass_emerald', 'Компас с изумрудами', 'epic', 'compass-b-3', 'Изумрудная оправа украшает точный циферблат.'],
  ['compass_ancient', 'Древний компас исследователя', 'epic', 'compass-b-4', 'Старинная вещь с потёртой картой и патиной.'],
  ['compass_magic', 'Легендарный магический компас', 'legendary', 'compass-b-5', 'Компас с мерцающей стрелкой, указывающей путь.'],
] as const;

export const COLLECTIBLE_ITEMS: CollectibleDefinition[] = [
  ...medals.map(([key, name, rarity, image, description]) => item(key, name, 'medal', rarity, image, description)),
  ...crystals.map(([key, name, rarity, image, description]) => item(key, name, 'crystal', rarity, image, description)),
  ...keys.map(([key, name, rarity, image, description]) => item(key, name, 'key', rarity, image, description)),
  ...artifacts.map(([key, name, rarity, image, description]) => item(key, name, 'artifact', rarity, image, description)),
  ...compasses.map(([key, name, rarity, image, description]) => item(key, name, 'compass', rarity, image, description)),
];

export const COLLECTIBLE_COLLECTIONS = [
  { code: 'medals', title: 'Медали путешественника', description: 'Соберите все 20 медалей экспедиции.', category: 'medal', rewardCoins: 10000 },
  { code: 'crystals', title: 'Сокровища недр', description: 'Соберите 10 уникальных кристаллов.', category: 'crystal', rewardCoins: 5000 },
  { code: 'keys', title: 'Тайны прошлого', description: 'Соберите 10 старинных ключей.', category: 'key', rewardCoins: 5000 },
  { code: 'compasses', title: 'Великие открытия', description: 'Соберите 10 разных компасов.', category: 'compass', rewardCoins: 7500 },
  { code: 'artifacts', title: 'Легенды Урала', description: 'Соберите 5 легендарных артефактов.', category: 'artifact', rewardCoins: 10000 },
] as const;

export const RARITY_DROP_WEIGHTS: Record<CollectibleRarity, number> = { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 };
export const BACKPACK_FIND_CHANCE: Record<number, number> = { 1: 0.1, 2: 0.15, 3: 0.2, 4: 0.25, 5: 0.3 };
export const COLLECTIBLE_COLLECTION_REWARDS: Record<string, number> = Object.fromEntries(COLLECTIBLE_COLLECTIONS.map(({ code, rewardCoins }) => [code, rewardCoins]));
