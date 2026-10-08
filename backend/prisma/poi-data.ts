// ============================================================
// КАТАЛОГ ТОЧЕК ИНТЕРЕСА «ТУРИСТ»
// ============================================================
//
// Здесь добавляются точки существующих категорий. Новая категория требует
// изменений в seed.ts и frontend/src/components/map/MapView.tsx.
//
// КАК ДОБАВИТЬ НОВУЮ ТОЧКУ:
// Скопируй блок ниже (между { и },) в конец массива POI_CATALOG
// и заполни свои значения. Проверяй координаты на Яндекс.Картах
// или Google Maps (клик правой кнопкой по месту → скопировать
// координаты) — это самый надёжный способ не ошибиться.
//
//   {
//     title: 'Название точки',
//     categoryCode: 'mountain', // см. список кодов категорий ниже
//     markerFixedSize: 0,       // 0 — метка уменьшается при отдалении; 1 — всегда полного размера (например, спонсорская)
//     lat: 55.1234,             // широта (первое число из Яндекс/Google Карт)
//     lng: 60.5678,             // долгота (второе число)
//     geofenceRadiusM: 30,      // радиус зоны открытия в метрах:
//                               //   30    — обычная точка (памятник, вершина, родник)
//                               //   200   — небольшой природный объект/остров
//                               //   1000  — крупный объект (карьер, курорт)
//                               //   2000-3000 — озеро/водохранилище (чтобы хватало с любого берега)
//     descriptionHistory: 'Историческая справка про место (2-4 предложения).',
//     interestingFacts: ['Интересный факт 1', 'Интересный факт 2'],
//     bestSeason: ['summer', 'autumn'], // из: summer, autumn, winter, spring
//     difficulty: 'easy',       // easy | medium | hard
//     baseXp: 300,              // опыт за посещение
//     baseCoins: 300,            // золото за посещение
//     baseCrystals: 0,           // бриллианты за посещение
//     requiresProof: false,     // фото/QR сейчас не проверяются сервисом посещений
//   },
//
// photo — фототочка с фотоаппаратом (маркер 3), 300 опыта и 300 золота.
// КОДЫ КАТЕГОРИЙ (влияют на цвет маркера на карте):
//   mountain  — гора/хребет/скалы     (коричневый)
//   lake      — озеро/водохранилище/пруд (синий)
//   river     — река                  (бирюзовый)
//   spring    — родник/ключ           (голубой)
//   cave      — пещера                (серый)
//   rare      — редкое/необычное место (фиолетовый)
//   museum    — музей/зоопарк         (светло-зелёный)
//   city      — город, маркер 1; 100 XP и 100 золота
//   township  — посёлок, маркер 11; 100 XP и 100 золота
//   trail     — пешая тропа / маршрутная точка, маркер 10; 300 XP и 400 золота
//   historic  — историческое место    (жёлтый)
//   monument  — памятник/собор/площадь (оранжевый)
//   park      — парк/нацпарк/заповедник (зелёный)
//   secret    — секретное место (видно только с 10000 XP) (чёрный)
//
// СКОЛЬКО СТАВИТЬ baseXp (баллов опыта) — ориентир по типу места:
//   Синий уровень (обычные точки):
//     город/село/деревня — 100 · озеро — 50 · река — 10 · мелкий памятник — 100
//   Жёлтый уровень (крупные городские объекты):
//     крупный объект города/села — 200 · парк (платный/бесплатный) — 200
//   Оранжевый уровень (горы):
//     вершина/гора — 500 · точка по пути на вершину — 50 · смотровая площадка — 200
//   Красный уровень (предложено игроками, координаты требуют проверки):
//     от 200 баллов — можно регулировать по значимости места
//
// ВАЖНО: координаты ниже проверены минимум по одному независимому
// источнику (Wikipedia / официальный сайт объекта / специализированный
// туристический портал с явными GPS-координатами) — по требованию
// добавлять только подтверждённые точки. Остальные места из
// первоначального списка (заброшенные озёра, памятники и т.д.)
// намеренно не включены — координаты для них не были подтверждены.
// Добавляй их сюда по мере того, как найдёшь точные координаты.
// ============================================================

export interface PoiSeedData {
  title: string;
  categoryCode: string;
  markerFixedSize?: 0 | 1;
  lat: number;
  lng: number;
  geofenceRadiusM: number;
  descriptionHistory: string;
  interestingFacts: string[];
  bestSeason: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  baseXp: number;
  baseCoins?: number;
  baseCrystals?: number;
  requiresProof: boolean;
  visibility?: 'public' | 'secret' | 'hidden_map';
}

export const POI_CATALOG: PoiSeedData[] = [
  // Координаты центра: https://ru.wikipedia.org/wiki/Увильды_(озеро)
  // Описание: https://www.chel.travel/activities/kray-trekh-tysyach-ozer/
  {
    title: 'Озеро Увильды', categoryCode: 'lake', lat: 55.523889, lng: 60.495278,
    geofenceRadiusM: 7000,
    descriptionHistory: 'Увильды — крупное озеро Челябинской области с изрезанными берегами и многочисленными островами. Оно находится у восточных предгорий Урала и известно прозрачной водой.',
    interestingFacts: ['Берега озера описывал писатель Дмитрий Мамин-Сибиряк.'],
    bestSeason: ['summer', 'autumn'], difficulty: 'easy', baseXp: 50, baseCoins: 300, baseCrystals: 0, requiresProof: false,
  },
  // Координаты центра: https://ru.wikipedia.org/wiki/Смолино_(озеро)
  // Описание: https://tourizm74.ru/turisticheskie-resursy/objects/?id=207
  {
    title: 'Озеро Смолино', categoryCode: 'lake', lat: 55.088333, lng: 61.438333,
    geofenceRadiusM: 4000,
    descriptionHistory: 'Смолино — природное озеро на юго-востоке Челябинска. Его берега примыкают к городским кварталам и служат местом прогулок у воды.',
    interestingFacts: ['Вода в озере слабосолёная.', 'Озеро охраняется как памятник природы.'],
    bestSeason: ['spring', 'summer', 'autumn'], difficulty: 'easy', baseXp: 50, baseCoins: 300, baseCrystals: 0, requiresProof: false,
  },
    {
    "title": "ваап",
    "categoryCode": "trail",
    "markerFixedSize": 0,
    "lat": 55.147455,
    "lng": 61.393771,
    "geofenceRadiusM": 50,
    "descriptionHistory": "Фототочка с видом на водоём в Сатке.",
    "interestingFacts": [],
    "bestSeason": [
        "spring",
        "summer",
        "autumn",
        "winter"
    ],
    "difficulty": "easy",
    "baseXp": 30000,
    "baseCoins": 3000000,
    "baseCrystals": 500,
    "requiresProof": false
},
  {
    "title": "в",
    "categoryCode": "trail",
    "markerFixedSize": 0,
    "lat": 55.147455,
    "lng": 61.393771,
    "geofenceRadiusM": 50,
    "descriptionHistory": "Фототочка с видом на водоём в Сатке.",
    "interestingFacts": [],
    "bestSeason": [
        "spring",
        "summer",
        "autumn",
        "winter"
    ],
    "difficulty": "easy",
    "baseXp": 30000,
    "baseCoins": 3000000,
    "baseCrystals": 500,
    "requiresProof": false
},
  // Фототочки: координаты и описания предоставлены владельцем игры.
  {
    "title": "Вид на водоём — Сатка",
    "categoryCode": "photo",
    "markerFixedSize": 0,
    "lat": 55.03448,
    "lng": 59.024104,
    "geofenceRadiusM": 50,
    "descriptionHistory": "Фототочка с видом на водоём в Сатке.",
    "interestingFacts": [],
    "bestSeason": [
        "spring",
        "summer",
        "autumn",
        "winter"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 300,
    "baseCrystals": 0,
    "requiresProof": false
},
  {
    "title": "Смотровая площадка на Сим",
    "categoryCode": "photo",
    "markerFixedSize": 0,
    "lat": 54.993937,
    "lng": 57.712373,
    "geofenceRadiusM": 50,
    "descriptionHistory": "Фототочка с панорамой города Сим.",
    "interestingFacts": [],
    "bestSeason": [
        "spring",
        "summer",
        "autumn",
        "winter"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 300,
    "baseCrystals": 0,
    "requiresProof": false
},
  {
    "title": "Вид на Златоуст и водоём",
    "categoryCode": "photo",
    "markerFixedSize": 0,
    "lat": 55.17246,
    "lng": 59.678186,
    "geofenceRadiusM": 50,
    "descriptionHistory": "Фототочка с видом на Златоуст и водоём.",
    "interestingFacts": [],
    "bestSeason": [
        "spring",
        "summer",
        "autumn",
        "winter"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 300,
    "baseCrystals": 0,
    "requiresProof": false
},
  {
    "title": "Вид на водоём — Миасс",
    "categoryCode": "photo",
    "markerFixedSize": 0,
    "lat": 55.050932,
    "lng": 60.093779,
    "geofenceRadiusM": 50,
    "descriptionHistory": "Фототочка с видом на водоём в Миассе.",
    "interestingFacts": [],
    "bestSeason": [
        "spring",
        "summer",
        "autumn",
        "winter"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 300,
    "baseCrystals": 0,
    "requiresProof": false
},
  {
    "title": "Вид на парк «Притяжение» — Магнитогорск",
    "categoryCode": "photo",
    "markerFixedSize": 0,
    "lat": 53.384606,
    "lng": 58.952378,
    "geofenceRadiusM": 50,
    "descriptionHistory": "Фототочка с видом на парк «Притяжение» в Магнитогорске.",
    "interestingFacts": [],
    "bestSeason": [
        "spring",
        "summer",
        "autumn",
        "winter"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 300,
    "baseCrystals": 0,
    "requiresProof": false
},
  {
    "title": "Смотровая площадка на Кизил",
    "categoryCode": "photo",
    "markerFixedSize": 0,
    "lat": 52.71958,
    "lng": 58.921285,
    "geofenceRadiusM": 50,
    "descriptionHistory": "Фототочка с видом на Кизил.",
    "interestingFacts": [],
    "bestSeason": [
        "spring",
        "summer",
        "autumn",
        "winter"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 300,
    "baseCrystals": 0,
    "requiresProof": false
},


  // Пешие маршруты и их ориентиры. Посещение точки не подтверждает весь трек.
  // Тропа из списка №1. Источники: https://taganay.org/sites/default/files/Таганай%20К%20Круглице.pdf
  {
    "title": "Тропа «Круглица» — вход, Центральная усадьба национального парка «Таганай»",
    "categoryCode": "trail",
    "lat": 55.22139,
    "lng": 59.73171,
    "geofenceRadiusM": 80,
    "descriptionHistory": "Начальная точка пешего путешествия к Круглице в национальном парке «Таганай». Здесь находится визит-центр Центральной усадьбы.",
    "interestingFacts": [
      "Паспорт маршрута предусматривает возвращение к той же усадьбе.",
      "Далее путь проходит через Горбатый мост и приют «Белый ключ»."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №2. Источники: https://taganay.org/sites/default/files/Таганай%20К%20Круглице.pdf
  {
    "title": "Тропа «К Круглице» — Горбатый мост",
    "categoryCode": "trail",
    "lat": 55.25159,
    "lng": 59.75643,
    "geofenceRadiusM": 60,
    "descriptionHistory": "Горбатый мост — ориентир на пути от Центральной усадьбы к приютам Таганая.",
    "interestingFacts": [
      "Следующая остановка в нитке маршрута — «Белый ключ».",
      "В паспорте у моста указаны площадка отдыха и указатели."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "medium",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №3. Источники: https://taganay.org/sites/default/files/Таганай%20К%20Круглице.pdf
  {
    "title": "Верхняя тропа Таганая — приют «Белый ключ»",
    "categoryCode": "trail",
    "lat": 55.26437,
    "lng": 59.7779,
    "geofenceRadiusM": 100,
    "descriptionHistory": "Приют «Белый ключ» — место остановки на пешем пути к Круглице.",
    "interestingFacts": [
      "Приют включён в прямой и обратный путь маршрута.",
      "Следом за ним маршрут проходит через «Гремучий ключ»."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "medium",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №4. Источники: https://taganay.org/sites/default/files/Таганай%20К%20Круглице.pdf
  {
    "title": "Верхняя тропа Таганая — приют «Гремучий ключ»",
    "categoryCode": "trail",
    "lat": 55.27723,
    "lng": 59.79587,
    "geofenceRadiusM": 100,
    "descriptionHistory": "«Гремучий ключ» — туристический приют на маршруте к Круглице.",
    "interestingFacts": [
      "В нитке маршрута он расположен после «Белого ключа».",
      "Паспорт перечисляет здесь туристические дома и места для палаток."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "medium",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №5. Источники: https://taganay.org/sites/default/files/Таганай%20К%20Круглице.pdf
  {
    "title": "Тропа «К Круглице» — Майские поляны",
    "categoryCode": "trail",
    "lat": 55.29624,
    "lng": 59.81558,
    "geofenceRadiusM": 80,
    "descriptionHistory": "Майские поляны — промежуточный ориентир пешего пути к Круглице.",
    "interestingFacts": [
      "Поляны следуют за приютом «Гремучий ключ» в нитке маршрута.",
      "Далее путь ведёт к Долине сказок."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "hard",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №6. Источники: https://taganay.org/sites/default/files/Таганай%20К%20Круглице.pdf
  {
    "title": "Тропа «К Круглице» — Долина сказок",
    "categoryCode": "trail",
    "lat": 55.31026,
    "lng": 59.83351,
    "geofenceRadiusM": 80,
    "descriptionHistory": "Долина сказок — природный ориентир перед завершающим подъёмом к Круглице.",
    "interestingFacts": [
      "Долина включена в прямой и обратный путь маршрута.",
      "Перед ней туристы проходят Майские поляны."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "hard",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №11. Источники: https://profsobranie.ru/assets/files/2023/rt-2-2023/56-70.pdf
  {
    "title": "Нижняя тропа Таганая — приют «Таганай»",
    "categoryCode": "trail",
    "lat": 55.30192,
    "lng": 59.85883,
    "geofenceRadiusM": 100,
    "descriptionHistory": "Приют «Таганай» — остановка для пеших путешественников среди достопримечательностей национального парка. Отсюда планируют выходы к Круглице и Долине сказок.",
    "interestingFacts": [
      "В исследовании 2023 года расстояние от приюта до Круглицы указано как 3 км.",
      "До Долины сказок в той же таблице указано 4,5 км."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "hard",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №12. Источники: https://profsobranie.ru/assets/files/2023/rt-2-2023/56-70.pdf
  {
    "title": "Нижняя тропа Таганая — Киалимский кордон",
    "categoryCode": "trail",
    "lat": 55.34307,
    "lng": 59.93305,
    "geofenceRadiusM": 100,
    "descriptionHistory": "Киалимский кордон служит ориентиром пеших походов к Ицылу и Дальнему Таганаю. Это удалённая остановка в сети приютов национального парка.",
    "interestingFacts": [
      "В исследовании 2023 года Ицыл указан в 3 км от кордона.",
      "Метеостанция «Таганай-гора» указана в 5 км от него."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "hard",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №13. Источники: https://profsobranie.ru/assets/files/2023/rt-2-2023/56-70.pdf
  {
    "title": "Тропа Таганай — метеостанция «Таганай-гора»",
    "categoryCode": "trail",
    "lat": 55.36911,
    "lng": 59.90872,
    "geofenceRadiusM": 100,
    "descriptionHistory": "Метеостанция «Таганай-гора» — высокогорная маршрутная точка среди тундровых участков и скальных гряд Таганая.",
    "interestingFacts": [
      "В описании окрестностей отмечены горная тундра и подгольцовое редколесье.",
      "Среди ближайших скальных объектов перечислены «Кепка» и «Верблюд»."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "hard",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №14. Источники: https://base.garant.ru/413970852/ ; https://zuratkul.ru/node/12993
  {
    "title": "Экотропа «Тайны озера» — начало у берега озера Зюраткуль",
    "categoryCode": "trail",
    "lat": 54.92273,
    "lng": 59.22666,
    "geofenceRadiusM": 60,
    "descriptionHistory": "Начало экотропы «Тайны озера» у Зюраткуля. Пешая прогулка знакомит с озёрным берегом и еловым лесом.",
    "interestingFacts": [
      "Официальная протяжённость маршрута — 3 км.",
      "В описании парка на прогулку отведено около двух часов."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №15. Источники: https://base.garant.ru/413970852/ ; https://zuratkul.ru/node/12993
  {
    "title": "Экотропа «Тайны озера» — начало деревянного настила",
    "categoryCode": "trail",
    "lat": 54.9205,
    "lng": 59.22924,
    "geofenceRadiusM": 60,
    "descriptionHistory": "Начало деревянного настила на экотропе «Тайны озера». Настил помогает пройти лесной участок прогулки вдоль Зюраткуля.",
    "interestingFacts": [
      "Начало настила выделено отдельной GPS-точкой в паспорте маршрута.",
      "Маршрут проходит без набора высоты."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №16. Источники: https://base.garant.ru/413970852/ ; https://zuratkul.ru/node/12993
  {
    "title": "Экотропа «Тайны озера» — конец деревянного настила",
    "categoryCode": "trail",
    "lat": 54.91326,
    "lng": 59.22497,
    "geofenceRadiusM": 60,
    "descriptionHistory": "Конец деревянного настила на экотропе «Тайны озера». Это самостоятельный ориентир прогулки по лесному побережью Зюраткуля.",
    "interestingFacts": [
      "Конец настила указан отдельной точкой в паспорте экотропы.",
      "С площадок у воды видны горы национального парка."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №17. Источники: https://zuratkul.ru/sites/default/files/Паспорт%20маршрута%20экотропа%20Малая%20медвежья_0.PDF ; https://zuratkul.ru/node/12977
  {
    "title": "Малая Медвежья тропа — вход в районе посёлка Зюраткуль",
    "categoryCode": "trail",
    "lat": 54.926589,
    "lng": 59.226812,
    "geofenceRadiusM": 80,
    "descriptionHistory": "Вход на «Малую медвежью» тропу в посёлке Зюраткуль. Путь ведёт через тайгу и субальпийские луга к горной тундре хребта.",
    "interestingFacts": [
      "Парк указывает 11 км на полный маршрут с возвращением.",
      "Первые 3 км оборудованы деревянным настилом."
    ],
    "bestSeason": [
      "summer",
      "autumn"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №18. Источники: https://base.garant.ru/413970720/ ; https://zuratkul.ru/sites/default/files/Паспорт%20маршрута%20экотропа%20Малая%20медвежья_0.PDF ; https://zuratkul.ru/node/12977
  {
    "title": "Большая Уральская тропа — хребет Зюраткуль",
    "categoryCode": "mountain",
    "lat": 54.95628,
    "lng": 59.17932,
    "geofenceRadiusM": 80,
    "descriptionHistory": "Вершинная точка хребта Зюраткуль на Большой Уральской тропе. Подъём выводит путешественника из леса в горную тундру.",
    "interestingFacts": [
      "Эта же вершина служит целью экотропы «Малая медвежья».",
      "В паспорте «Малой медвежьей» указана высота 1175 м."
    ],
    "bestSeason": [
      "summer"
    ],
    "difficulty": "hard",
    "baseXp": 500,
    "baseCoins": 1000,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №19. Источники: https://base.garant.ru/413970720/
  {
    "title": "Большая Уральская тропа — гора Большой Нургуш",
    "categoryCode": "mountain",
    "lat": 54.82085,
    "lng": 59.14702,
    "geofenceRadiusM": 80,
    "descriptionHistory": "Большой Нургуш — горная цель Большой Уральской тропы. Вершинное плато занято тундровой растительностью. По паспорту БУТ участки подхода и спуска требуют инструктора-проводника.",
    "interestingFacts": [
      "Высота — 1406 м, это высшая отметка Челябинской области.",
      "На вершинах встречаются кварцитовые останцы."
    ],
    "bestSeason": [
      "summer"
    ],
    "difficulty": "hard",
    "baseXp": 500,
    "baseCoins": 1000,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №20. Источники: https://base.garant.ru/413970720/
  {
    "title": "Большая Уральская тропа — хребет Большой Москаль",
    "categoryCode": "mountain",
    "lat": 54.82993,
    "lng": 59.03233,
    "geofenceRadiusM": 80,
    "descriptionHistory": "Большой Москаль — горный участок Большой Уральской тропы, связанный с кордоном «У трёх вершин».",
    "interestingFacts": [
      "Высшая точка хребта — Большая Калагаза, 1048 м.",
      "В паспорт БУТ включён выход на хребет с возвращением к кордону."
    ],
    "bestSeason": [
      "summer"
    ],
    "difficulty": "hard",
    "baseXp": 500,
    "baseCoins": 1000,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №21. Источники: https://base.garant.ru/413970720/
  {
    "title": "Большая Уральская тропа — гора Большой Уван",
    "categoryCode": "mountain",
    "lat": 54.81765,
    "lng": 58.93035,
    "geofenceRadiusM": 80,
    "descriptionHistory": "Большой Уван — каменистая гора на Большой Уральской тропе.",
    "interestingFacts": [
      "Высота горы — 1222 м.",
      "Для вершины характерны кварцитовые останцы и россыпи."
    ],
    "bestSeason": [
      "summer"
    ],
    "difficulty": "hard",
    "baseXp": 500,
    "baseCoins": 1000,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №22. Источники: https://base.garant.ru/413970720/
  {
    "title": "Большая Уральская тропа — кордон «У трёх вершин»",
    "categoryCode": "trail",
    "lat": 54.8161,
    "lng": 59.00132,
    "geofenceRadiusM": 100,
    "descriptionHistory": "Кордон «У трёх вершин» — опорная остановка Большой Уральской тропы.",
    "interestingFacts": [
      "Нитка маршрута предусматривает здесь несколько ночёвок.",
      "От кордона предусмотрены выходы к Большому Москалю и Большому Увану."
    ],
    "bestSeason": [
      "summer"
    ],
    "difficulty": "easy",
    "baseXp": 300,
    "baseCoins": 400,
    "baseCrystals": 0,
    "requiresProof": false
  },

  // Тропа из списка №23. Источники: https://base.garant.ru/413970720/ ; https://zuratkul.ru/node/12975
  {
    "title": "Большая Уральская тропа — село Тюлюк",
    "categoryCode": "village",
    "lat": 54.60607,
    "lng": 58.78091,
    "geofenceRadiusM": 100,
    "descriptionHistory": "Село Тюлюк — конечный населённый пункт в паспорте маршрута «Большая Уральская Тропа. Зюраткуль».",
    "interestingFacts": [
      "Предыдущий участок проходит от реки Большой Березяк.",
      "Парк также предусматривает варианты путешествия со стартом из Тюлюка."
    ],
    "bestSeason": [
      "summer"
    ],
    "difficulty": "easy",
    "baseXp": 100,
    "baseCoins": 100,
    "baseCrystals": 0,
    "requiresProof": false
  },


// P0049 · pamyatniki_prirody_chelyabinskaya_oblast.txt · источники: раздел D
{
  title: "Озеро Кошкуль",
  categoryCode: "lake",
  lat: 55.016794,
  lng: 60.030021,
  geofenceRadiusM: 1200,
  descriptionHistory: "Кошкуль — небольшое пресноводное озеро в Миасском округе. Песчаное дно и леса вдоль части берегов делают его интересным местом для знакомства с озёрными ландшафтами Южного Урала.",
  interestingFacts: [
    "Площадь водной поверхности составляет около 136 гектаров.",
    "Обычная глубина — 2–3 метра, наибольшая достигает примерно 6 метров.",
    "Северную и западную стороны озера окружают хвойные и смешанные леса.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0050 · pamyatniki_prirody_chelyabinskaya_oblast.txt · источники: раздел D
{
  title: "Озеро Малый Еланчик",
  categoryCode: "lake",
  lat: 54.923649,
  lng: 60.175597,
  geofenceRadiusM: 1000,
  descriptionHistory: "Малый Еланчик — лесное озеро возле Миасса, охраняемое как гидрологический памятник природы. Его природная ценность связана с сохранением самого водоёма и окружающего ландшафта.",
  interestingFacts: [
    "Озеро находится в Миасском городском округе.",
    "Водоём относится к гидрологическим памятникам природы.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0055 · pamyatniki_prirody_chelyabinskaya_oblast.txt · источники: раздел D
{
  title: "Озеро Иткуль",
  categoryCode: "lake",
  lat: 56.153739,
  lng: 60.525171,
  geofenceRadiusM: 3000,
  descriptionHistory: "Иткуль — крупное пресноводное озеро у Верхнего Уфалея. Его лесистые берега и археологические находки связывают природную историю края с древней металлургией.",
  interestingFacts: [
    "Водоём получил статус гидрологического памятника природы в 1987 году.",
    "В озеро впадают 13 речек и ручьёв, а вытекает Иткульский исток.",
    "На берегах выявлены памятники археологии, связанные с иткульской культурой.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0063 · pamyatniki_prirody_chelyabinskaya_oblast.txt · источники: раздел D
{
  title: "Гора Косотур",
  categoryCode: "mountain",
  lat: 55.181847,
  lng: 59.688237,
  geofenceRadiusM: 80,
  descriptionHistory: "Косотур — гора в городской черте Златоуста. Этот природный ориентир охраняется как геологический памятник и позволяет увидеть горный рельеф непосредственно рядом с городом.",
  interestingFacts: [
    "Высота вершины составляет 586 метров над уровнем моря.",
    "Гора имеет статус геологического памятника природы.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "medium",
  baseXp: 500,
  baseCoins: 1000,
  baseCrystals: 0,
  requiresProof: false,
},

// P0067 · pamyatniki_prirody_chelyabinskaya_oblast.txt · источники: раздел D
{
  title: "Гора Красный Камень",
  categoryCode: "mountain",
  lat: 56.065546,
  lng: 60.252115,
  geofenceRadiusM: 80,
  descriptionHistory: "Красный Камень — вершина Уфалейского хребта с пологой верхней частью и скальными выходами. Она включена в систему природных достопримечательностей Большой уральской тропы.",
  interestingFacts: [
    "Высота горы составляет 607 метров над уровнем моря.",
    "Отдельные скалы достигают высоты 30 метров.",
    "Объект охраняется как геологический памятник природы регионального значения.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "medium",
  baseXp: 500,
  baseCoins: 1000,
  baseCrystals: 0,
  requiresProof: false,
},

// P0078 · parki_razvlecheniy_chelyabinskaya_oblast.txt · источники: раздел D
{
  title: "ЦПКиО им. Ю. А. Гагарина",
  categoryCode: "park",
  lat: 55.162988,
  lng: 61.364032,
  geofenceRadiusM: 150,
  descriptionHistory: "Парк имени Гагарина вырос на участке Челябинского городского бора. В его истории сосновый ландшафт и старые карьеры объединились с городскими развлечениями и прогулочными пространствами.",
  interestingFacts: [
    "Официальная историческая публикация парка датирует его образование 18 мая 1934 года.",
    "Изначально здесь обустраивали павильоны, аттракционы и лодочную станцию на пруду.",
    "Позднее к объектам парка добавилась детская железная дорога.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 200,
  baseCrystals: 0,
  requiresProof: false,
},

// P0088 · parki_razvlecheniy_chelyabinskaya_oblast.txt · источники: раздел D
{
  title: "Притяжение",
  categoryCode: "park",
  lat: 53.382246,
  lng: 58.960207,
  geofenceRadiusM: 150,
  descriptionHistory: "«Притяжение» — городской курорт Магнитогорска, где парковая территория объединена с местами для спорта, прогулок и семейного отдыха. Проект развивается на землях бывшего теплично-садового совхоза ММК.",
  interestingFacts: [
    "Первые объекты курорта открылись для посетителей в июле 2022 года.",
    "Общая территория поэтапного проекта занимает 400 гектаров.",
    "В 2023 году здесь появились искусственное озеро с экотропой и видовой холм высотой 36 метров.",
  ],
  bestSeason: ["spring", "summer", "autumn", "winter"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 200,
  baseCrystals: 0,
  requiresProof: false,
},

// P0115 · Аша_точки_2ГИС.txt · источники: раздел D
{
  title: "Ухо",
  categoryCode: "monument",
  lat: 54.989945,
  lng: 57.281283,
  geofenceRadiusM: 40,
  descriptionHistory: "«Ухо» — металлическая городская скульптура в Аше. Необычный предмет превращён в самостоятельный художественный объект, с которым связана местная традиция загадывания желаний.",
  interestingFacts: [
    "Скульптура появилась в 2017 году.",
    "Размер объекта сопоставим с ростом человека.",
    "Посетители шепчут в скульптурное ухо желания; это городская традиция, а не обещание их исполнения.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0177 · Верхнеуральск_точки_2ГИС.txt · источники: раздел D
{
  title: "Перо",
  categoryCode: "monument",
  lat: 53.873718,
  lng: 59.206428,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятный знак «Перо» в Верхнеуральске посвящён литературе. Металлическое гусиное перо в чернильнице установлено на постаменте с обращёнными к писателям и читателям надписями.",
  interestingFacts: [
    "Знак открыли 23 мая 2015 года, в Год литературы.",
    "Тексты памятных табличек подготовил краевед Александр Вернигоров.",
    "Постамент имеет шесть граней.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0183 · Верхнеуральск_точки_2ГИС.txt · источники: раздел D
{
  title: "Памятник И.Кирилову",
  categoryCode: "monument",
  lat: 53.874621,
  lng: 59.205676,
  geofenceRadiusM: 40,
  descriptionHistory: "Мраморный памятник Ивану Кирилову напоминает об основании Верхнеуральска. Идею местных краеведов воплотил художник Александр Кульпин, самостоятельно освоивший работу с крупным каменным блоком.",
  interestingFacts: [
    "Памятник открыли 25 августа 2024 года к 290-летию города.",
    "Для бюста выделили глыбу белого мрамора массой более пяти тонн.",
    "Место установки связано с одним из бастионов Верхнеяицкой крепости.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0209 · Еманжелинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Добрый ангел мира",
  categoryCode: "monument",
  lat: 54.756718,
  lng: 61.314255,
  geofenceRadiusM: 40,
  descriptionHistory: "«Добрый ангел мира» в Еманжелинске — памятник с фигурой ангела над колонной. Голубь и земная полусфера в композиции передают идею мира.",
  interestingFacts: [
    "Памятник установлен в 2010 году.",
    "Колонна достигает высоты около 10 метров.",
    "Ангел изображён с раскрытыми крыльями и голубем в руках.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0246 · Златоуст_точки_2ГИС.txt · источники: раздел D
{
  title: "Скульптура Хозяйка Медной горы",
  categoryCode: "monument",
  lat: 55.134092,
  lng: 59.669281,
  geofenceRadiusM: 40,
  descriptionHistory: "Хозяйка Медной горы в горном парке Бажова представляет мир уральских сказов в металлической скульптуре. Литературный образ связывает прогулку по парку с горнозаводской культурой края.",
  interestingFacts: [
    "Скульптуру изготовили уральские мастера-литейщики.",
    "Для фигуры использован металл.",
    "Образ восходит к сказам Павла Бажова.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0249 · Златоуст_точки_2ГИС.txt · источники: раздел D
{
  title: "Крылатый конь",
  categoryCode: "monument",
  lat: 55.169194,
  lng: 59.674825,
  geofenceRadiusM: 40,
  descriptionHistory: "«Крылатый конь» в Златоусте обращается к сказочным образам и традициям уральских мастеров. Латунная фигура показывает коня, высекающего искры из камня.",
  interestingFacts: [
    "Высота композиции — около 4 метров, размах крыльев — 3,6 метра.",
    "На копыте размещено клеймо «Гильдия мастеров Урала».",
    "Работой над проектом руководил кузнец Юрий Чирков.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0254 · Златоуст_точки_2ГИС.txt · источники: раздел D
{
  title: "БРДМ-2РХ",
  categoryCode: "monument",
  lat: 55.139999,
  lng: 59.674423,
  geofenceRadiusM: 40,
  descriptionHistory: "БРДМ-2РХ в Златоусте — установленный на постаменте образец армейской техники. Списанная машина стала памятником и учебным наглядным объектом для курсантов ДОСААФ.",
  interestingFacts: [
    "БРДМ относится к бронированным разведывательно-дозорным машинам.",
    "Экземпляр перед установкой служил в армейской части.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0273 · Златоуст_точки_2ГИС.txt · источники: раздел D
{
  title: "По мотивам сказки «Хозяйка медной горы»",
  categoryCode: "monument",
  lat: 55.134081,
  lng: 59.668987,
  geofenceRadiusM: 40,
  descriptionHistory: "Барельеф в горном парке Бажова посвящён Хозяйке Медной горы — героине уральских сказов. Работа соединяет литературный образ с традицией художественного литья.",
  interestingFacts: [
    "Барельеф отлит из чугуна.",
    "Его изготовили каслинские мастера.",
    "Объект находится на территории горного парка имени П. П. Бажова в Златоусте.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0277 · Златоуст_точки_2ГИС.txt · источники: раздел D
{
  title: "П. П. Аносову",
  categoryCode: "monument",
  lat: 55.173688,
  lng: 59.672312,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Павлу Аносову в Златоусте посвящён металлургу и исследователю булатной стали. Фигура учёного показана с полосой булата, а рядом помещён микроскоп.",
  interestingFacts: [
    "Памятник открыт 19 декабря 1954 года.",
    "Бронзовая фигура установлена на постаменте из красного гранита.",
    "Высота всего сооружения составляет около 9,5 метра.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0342 · Карабаш_точки_2ГИС.txt · источники: раздел D
{
  title: "Городской музей Карабаша",
  categoryCode: "museum",
  lat: 55.470057,
  lng: 60.199091,
  geofenceRadiusM: 50,
  descriptionHistory: "Городской музей Карабаша рассказывает о прошлом медеплавильного города. Начало его собранию положила работа краеведа Андрея Панова, а жители передавали будущему музею документы и семейные вещи.",
  interestingFacts: [
    "Музей открылся 30 октября 1967 года.",
    "Его первая экспозиция разместилась в бывшей церкви.",
    "В собрании представлены минералы, исторические фотографии, документы и предметы повседневной жизни.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0409 · Копейск_точки_2ГИС.txt · источники: раздел D
{
  title: "Меховову Михаилу Фёдоровичу",
  categoryCode: "monument",
  lat: 55.113288,
  lng: 61.622739,
  geofenceRadiusM: 40,
  descriptionHistory: "Бюст Михаила Меховова входит в копейский мемориальный ансамбль участников Гражданской войны. Он установлен вместе с другими персональными памятниками городского сквера.",
  interestingFacts: [
    "Открытие группы бюстов состоялось 17 июля 1981 года.",
    "Бюсты изготовили на Химкинском комбинате художественного литья.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0412 · Копейск_точки_2ГИС.txt · источники: раздел D
{
  title: "Затееву Николаю Ильичу",
  categoryCode: "monument",
  lat: 55.113289,
  lng: 61.622895,
  geofenceRadiusM: 40,
  descriptionHistory: "Бюст Николая Затеева — часть копейского комплекса памяти участников Гражданской войны. Персональный памятник включён в единый ансамбль, задуманный Михаилом Семёновым.",
  interestingFacts: [
    "Бюст открыт в составе мемориальной группы 17 июля 1981 года.",
    "Группу отливали на Химкинском комбинате художественного литья.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0413 · Копейск_точки_2ГИС.txt · источники: раздел D
{
  title: "Бойцову Дмитрию Авксентьевичу",
  categoryCode: "monument",
  lat: 55.11329,
  lng: 61.623051,
  geofenceRadiusM: 40,
  descriptionHistory: "Бюст Дмитрия Бойцова находится в копейском сквере Павших героев. Памятник сохраняет имя человека, чьи годы жизни указаны на постаменте.",
  interestingFacts: [
    "Бюст входит в мемориальную группу, открытую 17 июля 1981 года.",
    "Бюсты группы отливали на Химкинском комбинате художественного литья.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0422 · Копейск_точки_2ГИС.txt · источники: раздел D
{
  title: "П. П. Бажову",
  categoryCode: "monument",
  lat: 55.057035,
  lng: 61.60505,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Павлу Бажову в посёлке Бажово изображает писателя сидящим на камне. Скульптура связывает название посёлка с автором знаменитых уральских сказов.",
  interestingFacts: [
    "Фигура изготовлена из чугуна и окрашена.",
    "Для постамента использован серый уральский камень.",
    "Высота композиции вместе с основанием составляет около 5 метров.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0423 · Копейск_точки_2ГИС.txt · источники: раздел D
{
  title: "И. И. Редикорцеву",
  categoryCode: "monument",
  lat: 55.11692,
  lng: 61.622723,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Ивану Редикорцеву посвящён горному инженеру, с именем которого связано открытие челябинского угля. Он напоминает об исследовательской основе будущего шахтёрского города.",
  interestingFacts: [
    "Памятник установлен в центре Копейска в 1963 году.",
    "Одним из авторов был краевед и архитектор Михаил Семёнов.",
    "Редикорцев занимался поиском мрамора по заданию Павла Аносова, когда обнаружил уголь.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0561 · Куса_точки_2ГИС.txt · источники: раздел D
{
  title: "И.В. Сталину",
  categoryCode: "monument",
  lat: 55.347634,
  lng: 59.451014,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Иосифу Сталину в Кусе — мемориальный объект советской исторической тематики. На нём размещена надпись о политическом руководителе СССР.",
  interestingFacts: [
    "В карточке объекта указано восстановление памятника в 2020 году.",
    "Восстановление связывается с активистами движения «Суть времени».",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0574 · Кыштым_точки_2ГИС.txt · источники: раздел D
{
  title: "Мемориал Вечный огонь",
  categoryCode: "monument",
  lat: 55.708714,
  lng: 60.538677,
  geofenceRadiusM: 60,
  descriptionHistory: "Кыштымский мемориал «Вечный огонь» посвящён жителям города, погибшим в Великой Отечественной войне. Со временем комплекс дополнили памятными объектами, связанными с другими поколениями защитников страны.",
  interestingFacts: [
    "Огонь впервые зажгли в 1975 году, к тридцатилетию Победы.",
    "Частицу огня доставили от московской Могилы Неизвестного Солдата.",
    "Аллея героев появилась на территории комплекса в 2000 году.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0577 · Кыштым_точки_2ГИС.txt · источники: раздел D
{
  title: "Борцам за установление советской власти в Кыштыме",
  categoryCode: "monument",
  lat: 55.700576,
  lng: 60.552475,
  geofenceRadiusM: 50,
  descriptionHistory: "Трёхгранная стела в Кыштыме посвящена борцам за установление советской власти. Её строительство стало общегородским делом: средства собирали на субботниках в школах и на предприятиях.",
  interestingFacts: [
    "Памятник открыт 29 октября 1968 года.",
    "Он находится на улице Калинина.",
    "При реконструкции, завершённой в 2021 году, стелу и постамент облицевали гранитом.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0616 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Памятник «Тыл — фронту»",
  categoryCode: "monument",
  lat: 53.407271,
  lng: 58.99241,
  geofenceRadiusM: 60,
  descriptionHistory: "Магнитогорский монумент «Тыл — фронту» посвящён людям, обеспечившим фронт металлом и оружием. Рабочий передаёт меч воину, показывая связь заводского труда и военной победы.",
  interestingFacts: [
    "Памятник сооружён в 1979 году.",
    "Авторы — скульптор Лев Головницкий и архитектор Яков Белопольский.",
    "Композицию связывают с триптихом, который продолжают памятники в Волгограде и Берлине.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0618 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Палатка первых строителей Магнитогорска",
  categoryCode: "monument",
  lat: 53.42593,
  lng: 58.99778,
  geofenceRadiusM: 50,
  descriptionHistory: "«Палатка первых строителей Магнитогорска» напоминает о начальном периоде строительства города. Треугольная форма монумента отсылает к временному жилью первостроителей.",
  interestingFacts: [
    "Открытие памятника состоялось 9 мая 1966 года.",
    "Авторы — Лев Головницкий и Евгений Александров.",
    "На основании размещены строки стихотворения Бориса Ручьёва о палатке.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0620 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Европа — Азия",
  categoryCode: "monument",
  lat: 53.422019,
  lng: 59.003341,
  geofenceRadiusM: 40,
  descriptionHistory: "Магнитогорский знак «Европа — Азия» посвящён географической теме двух частей света. Композиция показывает разделённый земной шар и буквенные обозначения Европы и Азии.",
  interestingFacts: [
    "Знак появился в 1979 году, к пятидесятилетию Магнитогорска.",
    "Проект выполнил архитектор В. Н. Богун.",
    "Основу композиции образуют два массивных блока.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0623 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Город трудовой доблести",
  categoryCode: "monument",
  lat: 53.411102,
  lng: 58.986632,
  geofenceRadiusM: 50,
  descriptionHistory: "Стела «Город трудовой доблести» посвящена вкладу Магнитогорска в обеспечение фронта. В оформлении использованы исторические фотографии металлургического комбината и его работников.",
  interestingFacts: [
    "Комплекс открыт 16 июля 2021 года.",
    "Высота центральной стелы составляет 17 метров.",
    "Вокруг неё расположены шесть пилонов.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0628 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Бывшему директору ММК И. Х. Ромазану",
  categoryCode: "monument",
  lat: 53.383716,
  lng: 58.982353,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Ивану Ромазану в Магнитогорске посвящён руководителю металлургического комбината. Скульптурный сюжет показывает директора рядом с ребёнком.",
  interestingFacts: [
    "Иван Ромазан возглавлял Магнитогорский металлургический комбинат.",
    "В композиции взрослый ведёт ребёнка за руку.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0632 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Венгерским военнопленным",
  categoryCode: "monument",
  lat: 53.441441,
  lng: 58.975032,
  geofenceRadiusM: 40,
  descriptionHistory: "Мемориал венгерским военнопленным в Магнитогорске выполнен в виде высокого тёмного креста. Объект сохраняет память об отдельной странице военной истории города.",
  interestingFacts: [
    "Мемориал датируется 1999 годом.",
    "У основания креста размещена двуязычная надпись.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0635 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Учителю",
  categoryCode: "monument",
  lat: 53.424283,
  lng: 58.983105,
  geofenceRadiusM: 40,
  descriptionHistory: "Магнитогорский памятник учителю изображает педагога и ученика на ступенях. Подъём по лестнице служит художественным образом получения знаний.",
  interestingFacts: [
    "Скульптура отлита из бронзы.",
    "Общая высота композиции — 3,25 метра.",
    "Учительница держит школьника за руку.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0636 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Родителям",
  categoryCode: "monument",
  lat: 53.422631,
  lng: 58.990507,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник родителям в Магнитогорске показывает пожилую пару на скамейке. Камерная композиция посвящена семейной памяти и старшему поколению.",
  interestingFacts: [
    "Материал памятника — чугун тёмно-серого цвета.",
    "В композицию включены две сидящие фигуры — мужчины и женщины.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0639 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Казакам станицы Магнитной",
  categoryCode: "monument",
  lat: 53.37727,
  lng: 58.989498,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник казакам станицы Магнитной напоминает о казачьем периоде истории Магнитогорска. Рядом с конём изображён казак в походном обмундировании конца XIX века.",
  interestingFacts: [
    "Памятник открыт 26 июня 2019 года.",
    "Автор скульптуры — Владимир Сырейщиков.",
    "Отливку выполнили в Златоусте под руководством Владимира Маслова.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0655 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "А. Н. Грязнову",
  categoryCode: "monument",
  lat: 53.397642,
  lng: 58.976778,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Алексею Грязнову в Магнитогорске соединяет память о труде сталевара и его участии в войне. Светлый бюст установлен на строгом гранитном постаменте.",
  interestingFacts: [
    "Памятник установлен в 1976 году.",
    "Архитектор монумента — В. С. Пономарёв.",
    "Бюст выполнен из белого мрамора, постамент — из серого гранита.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0660 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Студентам",
  categoryCode: "monument",
  lat: 53.419935,
  lng: 58.981986,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник студентам в Магнитогорске представляет молодую пару в одежде последней четверти XX века. Скульптура посвящена студенческой юности.",
  interestingFacts: [
    "Памятник открыт в День знаний — 1 сентября 2012 года.",
    "Автор композиции — скульптор Г. П. Плахов.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0661 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Детям и подросткам, помогавшим фронту",
  categoryCode: "monument",
  lat: 53.3818,
  lng: 59.017464,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник детям и подросткам, помогавшим фронту, расположен на левобережье Магнитогорска. Он напоминает о работе юных жителей в тылу во время Великой Отечественной войны.",
  interestingFacts: [
    "Объект находится в Орджоникидзевском районе города.",
    "Тема памятника — участие детей в заводском труде и помощи раненым и бойцам.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0662 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "М. Ю. Лермонтову",
  categoryCode: "monument",
  lat: 53.41546,
  lng: 58.982635,
  geofenceRadiusM: 50,
  descriptionHistory: "Михаил Лермонтов изображён в бурке, с книгой в руках. За его фигурой находится стела с крылатым образом, а окружающий сквер продолжает литературную тему рисунками и стихами поэта.",
  interestingFacts: [
    "Памятник открыт в 2016 году, его автор — Иван Коржев.",
    "Для композиции использованы бронза, латунь и гранит.",
    "Часть элементов ансамбля подсвечивается изнутри.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0663 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Металлургу демидовских времён",
  categoryCode: "monument",
  lat: 53.422555,
  lng: 58.988552,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник металлургу демидовских времён в Магнитогорске обращается к ранней истории уральской металлургии. Рабочий изображён рядом с молотом и наковальней.",
  interestingFacts: [
    "Автор — скульптор Г. П. Плахов.",
    "Памятник открыт 24 октября 2017 года.",
    "Высота человеческой фигуры составляет 1,85 метра.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0665 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Дворнику",
  categoryCode: "monument",
  lat: 53.422542,
  lng: 58.987408,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник дворнику в Магнитогорске посвящён людям, поддерживающим городское хозяйство. В композиции рядом показаны женщина с метлой и сантехник.",
  interestingFacts: [
    "Памятник открыт 25 августа 2015 года.",
    "Скульптуру создал А. Сильницкий.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0752 · Магнитогорск_точки_2ГИС.txt · источники: раздел D
{
  title: "Дом поэта Б. А. Ручьёва",
  categoryCode: "museum",
  lat: 53.412449,
  lng: 58.984921,
  geofenceRadiusM: 50,
  descriptionHistory: "В доме Бориса Ручьёва в Магнитогорске действует мемориальный литературный музей. Экспозиции посвящены поэту-первостроителю и литературной жизни города.",
  interestingFacts: [
    "Музей входит в структуру Магнитогорского краеведческого музея.",
    "Настоящая фамилия Бориса Ручьёва — Кривощёков.",
    "В экспозиции представлены материалы о жизни и творчестве поэта.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0754 · Миасс_точки_2ГИС.txt · источники: раздел D
{
  title: "В. И. Ленину — почётному насекальщику",
  categoryCode: "monument",
  lat: 54.98502,
  lng: 60.10383,
  geofenceRadiusM: 40,
  descriptionHistory: "Миасский памятник Ленину как почётному насекальщику связан с историей напилочного завода. Необычное посвящение отражает решение рабочих символически включить Ленина в заводской коллектив.",
  interestingFacts: [
    "Звание почётного насекальщика коллектив присвоил Ленину в 1923 году.",
    "Начислявшиеся от его имени средства направлялись на культурную работу и литературу.",
    "Памятник создавался на средства рабочих.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0778 · Миасс_точки_2ГИС.txt · источники: раздел D
{
  title: "Скрепка",
  categoryCode: "monument",
  lat: 55.141167,
  lng: 60.153013,
  geofenceRadiusM: 40,
  descriptionHistory: "Гигантская «Скрепка» в миасском Машгородке превращает привычную канцелярскую вещь в городскую скульптуру. Она входит в Парк гигантских фигур.",
  interestingFacts: [
    "Высота скульптуры составляет 9,28 метра.",
    "Для изготовления использована нержавеющая сталь.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0784 · Миасс_точки_2ГИС.txt · источники: раздел D
{
  title: "Могила поэта-просветителя М. Акмуллы",
  categoryCode: "monument",
  lat: 55.002038,
  lng: 60.062785,
  geofenceRadiusM: 40,
  descriptionHistory: "Могила Мифтахетдина Акмуллы в Миассе сохраняет память о башкирском поэте и просветителе. Мраморный мемориал напоминает очертания восточной архитектуры.",
  interestingFacts: [
    "Новый памятник установили в 1981 году, к 150-летию поэта.",
    "Композиция состоит из двух пилонов из белого мрамора.",
    "Автор памятника — А. В. Семёнов.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0907 · Озёрск_точки_2ГИС.txt · источники: раздел D
{
  title: "Жилой дом с башней",
  categoryCode: "historic",
  lat: 55.760654,
  lng: 60.717187,
  geofenceRadiusM: 60,
  descriptionHistory: "Дом с башней на проспекте Ленина в Озёрске формирует выразительный угол городского квартала. Его ступенчатый силуэт завершается ротондой со шпилем, а оформление фасадов следует неоклассической традиции.",
  interestingFacts: [
    "Здание датируется 1953 годом.",
    "Оно расположено на пересечении проспекта Ленина и улицы Герцена.",
    "Верхняя ротонда имеет восемь граней.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P0952 · Сатка_точки_2ГИС.txt · источники: раздел D
{
  title: "Серп и молот",
  categoryCode: "monument",
  lat: 55.04083,
  lng: 58.967079,
  geofenceRadiusM: 50,
  descriptionHistory: "Саткинский знак «Серп и молот» установлен на возвышенности и посвящён пятидесятилетию СССР. Композиция воспроизводит советскую эмблему союза рабочих и крестьян.",
  interestingFacts: [
    "Знак появился в 1972 году.",
    "Он виден с улицы Пролетарской.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "medium",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1008 · Снежинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Памятник П.П. Бажову",
  categoryCode: "monument",
  lat: 56.087526,
  lng: 60.727745,
  geofenceRadiusM: 40,
  descriptionHistory: "Бюст Павла Бажова в Снежинске находится возле детской библиотеки, носящей имя писателя. Памятник связывает городское пространство с литературной традицией уральских сказов.",
  interestingFacts: [
    "Памятник установлен в 1994 году.",
    "Композиция выполнена как бюст на пьедестале.",
    "Бажов — автор сборника «Малахитовая шкатулка».",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1062 · Троицк_точки_2ГИС.txt · источники: раздел D
{
  title: "Ф. Н. Плевако",
  categoryCode: "monument",
  lat: 54.081719,
  lng: 61.559157,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Фёдору Плевако в Троицке посвящён известному российскому адвокату. Монумент стал местом мероприятий, связанных с историей и традициями адвокатуры.",
  interestingFacts: [
    "При создании памятника использованы бронза и гранит.",
    "Скульптор — Максим Ведерников, архитектор — Владимир Сорокин.",
    "У памятника проводят Плеваковские чтения и церемонии адвокатской присяги.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1129 · Троицк_точки_2ГИС.txt · источники: раздел D
{
  title: "Здание пассажа Яушевых",
  categoryCode: "historic",
  lat: 54.086969,
  lng: 61.560429,
  geofenceRadiusM: 80,
  descriptionHistory: "Пассаж Яушевых на Нижнем базаре Троицка напоминает о купеческом размахе города. Большой универсальный магазин сочетал нарядную архитектуру с техническими новшествами начала XX века.",
  interestingFacts: [
    "Пассаж открылся в 1911 году.",
    "В здании были телефон, лифт и электрическое освещение.",
    "Торговые отделы занимали первые два этажа трёхэтажного корпуса.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1133 · Троицк_точки_2ГИС.txt · источники: раздел D
{
  title: "Здание, в котором работал Н. И. Акаевский",
  categoryCode: "historic",
  lat: 54.084386,
  lng: 61.543015,
  geofenceRadiusM: 60,
  descriptionHistory: "Бывшая женская гимназия в Троицке — краснокирпичное учебное здание с просторным актовым залом. Позднейшая история дома связана с работой Николая Акаевского.",
  interestingFacts: [
    "Здание закладывали в 1911 году; гимназия переехала в него в 1913 году.",
    "Двухэтажный корпус имеет Н-образный план.",
    "Н. И. Акаевский работал здесь в 1930–1974 годах.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1144 · Трёхгорный_точки_2ГИС.txt · источники: раздел D
{
  title: "Скульптура Глухарь",
  categoryCode: "monument",
  lat: 54.80961,
  lng: 58.44746,
  geofenceRadiusM: 40,
  descriptionHistory: "«Глухарь» в Трёхгорном напоминает о лесном прошлом местности, где появился город. В истории Росатома эта скульптура также связывается с закрытостью атомграда.",
  interestingFacts: [
    "Скульптура появилась весной 1967 года.",
    "Её установили на возвышенном месте города.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1163 · Трёхгорный_точки_2ГИС.txt · источники: раздел D
{
  title: "Скульптура Икар",
  categoryCode: "monument",
  lat: 54.814125,
  lng: 58.439076,
  geofenceRadiusM: 40,
  descriptionHistory: "Скульптурная композиция «Икар» входит в ансамбль культурного центра Трёхгорного. Она связывает пространство сквера с одноимённым Дворцом культуры.",
  interestingFacts: [
    "Композиция установлена в 1974 году.",
    "Место установки — сквер перед Дворцом культуры «Икар», открытым в 1971 году.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1169 · Трёхгорный_точки_2ГИС.txt · источники: раздел D
{
  title: "Памятник Участникам ликвидации Чернобыльской катастрофы",
  categoryCode: "monument",
  lat: 54.818871,
  lng: 58.439256,
  geofenceRadiusM: 40,
  descriptionHistory: "Мемориал в Трёхгорном посвящён местным участникам ликвидации Чернобыльской аварии. Он сохраняет память о работе горожан на атомной станции и последствиях этой работы для их жизни.",
  interestingFacts: [
    "Открытие состоялось 9 сентября 2020 года.",
    "В ликвидации участвовали 106 жителей Трёхгорного.",
    "Надпись на памятнике охватывает период 1986–1990 годов.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1209 · Чебаркуль_точки_2ГИС.txt · источники: раздел D
{
  title: "Памятник челябинскому метеориту",
  categoryCode: "monument",
  lat: 54.964891,
  lng: 60.342469,
  geofenceRadiusM: 40,
  descriptionHistory: "Чебаркульский памятник челябинскому метеориту напоминает о падении небесного тела 15 февраля 2013 года. В мраморной композиции воспроизведены очертания озера и отверстие, символизирующее полынью.",
  interestingFacts: [
    "Памятник открыт 15 февраля 2014 года, через год после события.",
    "Автор проекта — Андрей Коренюгин.",
    "Основной материал — белый коелгинский мрамор.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1217 · Чебаркуль_точки_2ГИС.txt · источники: раздел D
{
  title: "Чебаркульцам-ликвидаторам последствий радиационных аварий",
  categoryCode: "monument",
  lat: 54.978743,
  lng: 60.360291,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник в Чебаркуле посвящён землякам, участвовавшим в ликвидации последствий радиационных аварий. Он служит местом памятных встреч в парке Победы.",
  interestingFacts: [
    "Монумент установлен в 2003 году.",
    "В ликвидации Чернобыльской аварии участвовали 87 жителей города и района.",
    "Памятные мероприятия возле него приурочены к 26 апреля.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1220 · Чебаркуль_точки_2ГИС.txt · источники: раздел D
{
  title: "А.П. Гриценко",
  categoryCode: "monument",
  lat: 54.982648,
  lng: 60.374079,
  geofenceRadiusM: 40,
  descriptionHistory: "Бюст Александра Гриценко в Чебаркуле посвящён многолетнему руководителю местного молочного завода. Его биография связана с развитием пищевой промышленности города.",
  interestingFacts: [
    "Александр Гриценко руководил Чебаркульским молочным заводом с 1970 по 2006 год.",
    "Он был удостоен звания заслуженного работника пищевой индустрии России.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1238 · Чебаркуль_точки_2ГИС.txt · источники: раздел D
{
  title: "С.К. Ляпоте",
  categoryCode: "monument",
  lat: 54.995104,
  lng: 60.394373,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Степану Ляпоте в Чебаркуле посвящён командиру стрелковой роты, участвовавшему в освобождении Мелитополя. Его имя связано с подвигом бойцов 417-й стрелковой дивизии.",
  interestingFacts: [
    "Степан Ляпота командовал ротой 1369-го стрелкового полка.",
    "Звание Героя Советского Союза присвоено ему 1 ноября 1943 года.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1286 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Курчатов",
  categoryCode: "monument",
  lat: 55.159329,
  lng: 61.362752,
  geofenceRadiusM: 50,
  descriptionHistory: "Челябинский памятник Игорю Курчатову посвящён учёному и развитию ядерной физики. Две высокие опоры и разделённая сфера образуют художественный образ расщеплённого атома.",
  interestingFacts: [
    "Композиция открыта в 1986 году, когда Челябинск отмечал 250-летие.",
    "Высота пилонов — 27 метров.",
    "Автор скульптуры — Вардкес Авакян.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1288 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Сказ об Урале",
  categoryCode: "monument",
  lat: 55.141713,
  lng: 61.413738,
  geofenceRadiusM: 50,
  descriptionHistory: "«Сказ об Урале» на привокзальной площади Челябинска изображает могучего мастера с молотом. Монумент посвящён промышленному труду и мастерству жителей Урала.",
  interestingFacts: [
    "Памятник установлен в 1967 году.",
    "Фигура высечена из гранита.",
    "Общая высота составляет 12 метров; авторы — Виталий Зайков и Евгений Александров.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1289 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Стела танковой школы",
  categoryCode: "monument",
  lat: 55.149489,
  lng: 61.406804,
  geofenceRadiusM: 40,
  descriptionHistory: "Стела танковой школы отмечает место размещения челябинских учебных заведений, готовивших офицеров-танкистов. Её надпись рассказывает о нескольких этапах истории училища.",
  interestingFacts: [
    "В 1941–1943 годах здесь размещалось Челябинское танковое училище.",
    "В 1943–1948 годах учреждение носило название танко-технического училища.",
    "На стеле указано, что учебные заведения подготовили свыше 12 тысяч офицеров.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1291 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Скорбящим матерям",
  categoryCode: "monument",
  lat: 55.118277,
  lng: 61.363213,
  geofenceRadiusM: 50,
  descriptionHistory: "Мемориал скорбящим матерям в Челябинске посвящён военнослужащим, умершим в госпиталях города и области. Женские образы передают горе семьи, потерявшей солдата.",
  interestingFacts: [
    "Две фигуры символизируют мать и жену не вернувшегося с войны человека.",
    "Комплекс связан с памятью о госпитальных захоронениях военного времени.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1292 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Орлёнок",
  categoryCode: "monument",
  lat: 55.16045,
  lng: 61.39296,
  geofenceRadiusM: 40,
  descriptionHistory: "«Орлёнок» на Алом поле посвящён молодым участникам революции и Гражданской войны на Южном Урале. Бронзовая фигура стала одним из известных памятников Челябинска.",
  interestingFacts: [
    "Памятник открыт 29 октября 1958 года.",
    "Авторы — Лев Головницкий и Евгений Александров.",
    "Четырёхметровую фигуру отлили на ленинградском заводе «Монументскульптура».",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1297 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Столыпин",
  categoryCode: "monument",
  lat: 55.170627,
  lng: 61.399477,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Петру Столыпину в Челябинске посвящён государственному деятелю начала XX века. Композиция выполнена в традициях парадного городского монумента.",
  interestingFacts: [
    "Открытие состоялось 22 ноября 2017 года.",
    "Постамент украшен барельефами.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1298 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Мавзолей Ленина",
  categoryCode: "monument",
  lat: 55.160498,
  lng: 61.391294,
  geofenceRadiusM: 50,
  descriptionHistory: "Челябинский памятник-мавзолей Ленину на Алом поле представляет собой многоярусное мемориальное сооружение. В его центре находится бронзовый бюст.",
  interestingFacts: [
    "Объект открыт 15 июля 1925 года.",
    "Сооружение выполнено из серого гранита.",
    "К верхнему уровню ведут две боковые лестницы.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1299 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "На новый путь",
  categoryCode: "monument",
  lat: 55.147424,
  lng: 61.417084,
  geofenceRadiusM: 40,
  descriptionHistory: "«На новый путь» в Челябинске посвящён железнодорожникам — участникам революционных событий. Центральный персонаж переводит железнодорожную стрелку, сжимая другой рукой древко знамени.",
  interestingFacts: [
    "Скульптурная композиция выполнена из кованой меди.",
    "Постамент из серого гранита стилизован под железнодорожную насыпь.",
    "Памятник относится к объектам культурного наследия регионального значения.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1300 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Нулевой километр",
  categoryCode: "monument",
  lat: 55.163685,
  lng: 61.400682,
  geofenceRadiusM: 40,
  descriptionHistory: "«Нулевой километр» в Челябинске отсылает к традиции отсчитывать дорожные расстояния между почтовыми учреждениями. Знак установлен напротив здания бывшего Главпочтамта.",
  interestingFacts: [
    "На знаке изображены гербы Челябинска и России.",
    "В карточке 2ГИС объект называется стелой «Нулевая верста».",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1302 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Памятник сотрудникам правопорядка",
  categoryCode: "monument",
  lat: 55.168769,
  lng: 61.39592,
  geofenceRadiusM: 40,
  descriptionHistory: "Челябинский мемориал сотрудникам правопорядка посвящён погибшим при исполнении служебного долга. Он увековечивает память сотрудников правоохранительных органов области.",
  interestingFacts: [
    "Мемориал открыт 8 ноября 2013 года.",
    "В 2ГИС он также обозначен названием «Солдатам правопорядка».",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1306 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Музей военной техники",
  categoryCode: "museum",
  lat: 55.168951,
  lng: 61.453427,
  geofenceRadiusM: 80,
  descriptionHistory: "Музей военной техники в челябинском Саду Победы — экспозиция под открытым небом. Здесь можно познакомиться с образцами бронетехники и автомобилями разных периодов.",
  interestingFacts: [
    "Музей открыт в 2007 году.",
    "В экспозиции представлены Т-34, ЗИС-5 и ИСУ-152.",
    "Рядом с машинами размещены стенды с техническими характеристиками.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1308 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Доблестным сынам Отечества",
  categoryCode: "monument",
  lat: 55.163357,
  lng: 61.409522,
  geofenceRadiusM: 50,
  descriptionHistory: "Мемориал «Доблестным сынам Отечества» на Бульваре Славы в Челябинске посвящён воинам-интернационалистам. Над гранитной композицией, напоминающей горное ущелье, находится орёл.",
  interestingFacts: [
    "Фигура орла выполнена из бронзы.",
    "Размах его крыльев составляет около пяти метров.",
    "Гранитная стела достигает десяти метров в высоту.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1311 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Защитникам Отечества",
  categoryCode: "monument",
  lat: 55.163345,
  lng: 61.408951,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник защитникам Отечества на челябинском Бульваре Славы показывает разлучённую войной пару. Военная память здесь выражена через личную историю солдата и девушки.",
  interestingFacts: [
    "Композицию создал Виктор Маркунасов.",
    "В центре памятника находятся две человеческие фигуры.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1316 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Глинка",
  categoryCode: "monument",
  lat: 55.167349,
  lng: 61.401937,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Михаилу Глинке на площади Искусств в Челябинске посвящён русскому композитору. Фигура в полный рост показана рядом с большой нотной тетрадью.",
  interestingFacts: [
    "Открытие памятника состоялось в 2004 году.",
    "Скульптор — Вардкес Авакян, архитектор — Евгений Александров.",
    "Высота бронзовой фигуры — 4,5 метра, гранитного постамента — 2,5 метра.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1319 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Горький",
  categoryCode: "monument",
  lat: 55.159683,
  lng: 61.387741,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Максиму Горькому возле педагогического университета в Челябинске представляет писателя в традициях советской городской скульптуры.",
  interestingFacts: [
    "Скульптура изготовлена из гипса с окраской под бронзу.",
    "Это тиражированная, а не единственная авторская отливка.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1322 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Основателям Челябинска",
  categoryCode: "monument",
  lat: 55.167371,
  lng: 61.400389,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник основателям Челябинска объединяет образы людей, связанных с появлением крепости и развитием края. На основании размещены выдержки из исторических документов.",
  interestingFacts: [
    "В композицию входят четыре бронзовые фигуры: офицер А. И. Тевкелев, башкир, крестьянин и казак.",
    "Шпиль венчает фигура архангела Михаила.",
    "Монумент расположен в районе исторического центра Челябинской крепости.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1329 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Ленин",
  categoryCode: "monument",
  lat: 55.159612,
  lng: 61.402598,
  geofenceRadiusM: 40,
  descriptionHistory: "Памятник Ленину на площади Революции в Челябинске — часть центрального городского ансамбля советского периода. Бронзовая фигура установлена перед местом проведения городских торжеств.",
  interestingFacts: [
    "Памятник установлен в 1959 году.",
    "Скульпторы — Лев Головницкий и Виталий Зайков, архитектор — Евгений Александров.",
    "Бронзовую фигуру отлили в Ленинграде на заводе «Монументскульптура».",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1331 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Влюблённые",
  categoryCode: "monument",
  lat: 55.169097,
  lng: 61.405261,
  geofenceRadiusM: 40,
  descriptionHistory: "«Влюблённые» на набережной Миасса в Челябинске изображают молодую пару. Девушка держит букет сирени, в котором автор предусмотрела особую деталь для внимательного зрителя.",
  interestingFacts: [
    "Скульптуру открыли 11 июня 2024 года.",
    "Автор — София Грекова-Прохоренко.",
    "В букете можно найти цветок с пятью лепестками.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

// P1335 · Челябинск_точки_2ГИС.txt · источники: раздел D
{
  title: "Памятник тракторозаводцам",
  categoryCode: "monument",
  lat: 55.169705,
  lng: 61.455593,
  geofenceRadiusM: 60,
  descriptionHistory: "Памятник тракторозаводцам в Челябинске посвящён работникам предприятия, погибшим на войне. В основе композиции — высокий металлический обелиск и плиты с именами.",
  interestingFacts: [
    "Высота вертикальной части из нержавеющей стали составляет 36 метров.",
    "На мемориальных досках перечислены 1597 погибших тракторостроевцев.",
    "В оформлении основания соединены изображения рабочего, солдата и танков.",
  ],
  bestSeason: ["spring", "summer", "autumn"],
  difficulty: "easy",
  baseXp: 150,
  baseCoins: 300,
  baseCrystals: 0,
  requiresProof: false,
},

{
  title: 'Айские притёсы',
  categoryCode: 'park',
  lat: 55.153070,
  lng: 58.691732,
  geofenceRadiusM: 350,
  descriptionHistory:
    'Айские притёсы — одна из самых известных природных достопримечательностей Южного Урала. Высокие известняковые скалы возвышаются над рекой Ай, открывая живописные панорамные виды и привлекая туристов, фотографов и любителей активного отдыха со всей России.',
  interestingFacts: [
    'Высота отвесных скал достигает около 100 метров над рекой Ай.',
    'С вершины притёсов открывается один из самых красивых видов Челябинской области.',
    'Это популярное место для пеших походов, фотосессий и встречи рассветов и закатов.',
  ],
  bestSeason: ['summer', 'autumn', 'spring'],
  difficulty: 'medium',
  baseXp: 500,
  requiresProof: false,
},
{
  title: 'Челябинск',
  categoryCode: 'city',
  lat:  55.160058,
  lng:  61.402052,
  geofenceRadiusM: 13000,
  descriptionHistory:
    'Челябинск был основан в 1736 году как сторожевая крепость на месте башкирской деревни Селябэ-Челябы для защиты от набегов кочевников и охраны торгового пути. В XVIII-XIX веках стал крупным торговым центром. Бурное развитие города началось с прокладкой Транссибирской магистрали и строительством металлургических заводов в начале XX века [citation:11].',
  interestingFacts: [
    'Главный промышленный центр Южного Урала, известный как "Танкоград" — во время Второй мировой войны здесь производили танки Т-34 [citation:11].',
    'Город раскинулся на берегах реки Миасс, у восточного склона Уральских гор.',
    'В Челябинске находится знаменитый ледовый дворец "Уральская молния" и пешеходная улица Кирова.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Магнитогорск',
  categoryCode: 'city',
  lat: 53.42,
  lng: 59.05,
  geofenceRadiusM: 13000,
  descriptionHistory:
    'Магнитогорск вырос из небольшого посёлка при Магнитной горе, богатой железной рудой. В 1929 году началось строительство гиганта советской индустрии — Магнитогорского металлургического комбината (ММК), что превратило его в один из ключевых городов страны [citation:2].',
  interestingFacts: [
    'Город знаменит Магнитогорским металлургическим комбинатом, который является одним из крупнейших в мире.',
    'В годы войны магнитогорская сталь шла на производство брони для танков и самолётов [citation:1].',
    'Монумент "Тыл — фронту" на левом берегу Урала символизирует единство города и фронта во время войны.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Златоуст',
  categoryCode: 'city',
  lat: 55.17,
  lng: 59.65,
  geofenceRadiusM: 4000,
  descriptionHistory:
    'Златоуст основан в 1754 году в связи со строительством железоделательного завода на реке Ай. Название получил по церкви во имя Иоанна Златоуста [citation:1]. Город известен как центр уникальной гравюры на металле и производства булатных клинков.',
  interestingFacts: [
    'Златоустовская гравюра на стали — это вид декоративно-прикладного искусства, возникший в XIX веке. Её используют для украшения оружия [citation:1].',
    'В окрестностях города находится национальный парк "Таганай" с живописными горными хребтами и каменными реками — курумниками.',
    'Здесь родился и работал известный оружейник и металлург Павел Петрович Аносов, раскрывший секрет булатной стали.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Копейск',
  categoryCode: 'city',
  lat: 55.12,
  lng: 61.63,
  geofenceRadiusM: 3500,
  descriptionHistory:
    'Копейск вырос из шахтёрских поселков, возникших в начале XX века на базе Челябинского угольного бассейна. Статус города получил в 1933 году. Название связано с угольными копями [citation:1].',
  interestingFacts: [
    'Долгое время был центром добычи бурого угля в регионе [citation:2].',
    'В окрестностях Копейска находятся многочисленные озера, популярные для отдыха и рыбалки.',
    'Город является крупным железнодорожным узлом.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Миасс',
  categoryCode: 'city',
  lat: 55.05,
  lng: 60.11,
  geofenceRadiusM: 4000,
  descriptionHistory:
    'Миасс основан в 1773 году как медеплавильный и железоделательный завод на реке Миасс. Позднее стал одним из центров золотодобычи на Урале [citation:1].',
  interestingFacts: [
    'В окрестностях Миасса расположен знаменитый озеро Тургояк, известное своей чистейшей водой, и национальный парк "Таганай".',
    'Город является родиной автомобилей "Урал", здесь находится Уральский автомобильный завод [citation:1].',
    'В Миассе и его окрестностях добывали золото, в том числе для чеканки монет.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Озёрск',
  categoryCode: 'city',
  lat: 55.76,
  lng: 60.7,
  geofenceRadiusM: 4000,
  descriptionHistory:
    'Озёрск был основан как закрытый город (ЗАТО) в 1945 году для обеспечения работы комбината "Маяк" по производству оружейного плутония. Изначально носил названия Челябинск-40 и Челябинск-65 [citation:1].',
  interestingFacts: [
    'Градообразующее предприятие — производственное объединение "Маяк", один из ключевых объектов ядерной промышленности СССР.',
    'Город находится в живописном месте на берегу озера Иртяш.',
    'Долгое время был засекречен и отсутствовал на картах.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Снежинск',
  categoryCode: 'city',
  lat: 56.09,
  lng: 60.73,
  geofenceRadiusM: 3500,
  descriptionHistory:
    'Снежинск — ещё один закрытый город (ЗАТО), основанный в 1957 году. Был центром разработки ядерного оружия и ядерной энергетики. Ранее носил названия Челябинск-50 и Челябинск-70 [citation:1].',
  interestingFacts: [
    'Основное предприятие — Российский федеральный ядерный центр — ВНИИ технической физики [citation:1].',
    'Город расположен в лесистой местности, на берегу озера Синара.',
    'Является важнейшим научным центром страны.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Троицк',
  categoryCode: 'city',
  lat: 54.1,
  lng: 61.58,
  geofenceRadiusM: 3500,
  descriptionHistory:
    'Троицк основан в 1743 году как одна из крепостей Оренбургской пограничной линии. Играл важную роль в торговле с Казахстаном и странами Азии, был крупным купеческим городом [citation:1].',
  interestingFacts: [
    'В XIX веке Троицк был крупнейшим центром торговли хлебом и скотом в Оренбургской губернии.',
    'В городе находится краеведческий музей с богатой коллекцией, а также памятники купеческой архитектуры.',
    'Рядом с городом протекает река Уй и находится граница с Казахстаном.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Кыштым',
  categoryCode: 'city',
  lat: 55.71,
  lng: 60.56,
  geofenceRadiusM: 3500,
  descriptionHistory:
    'Кыштым возник в середине XVIII века при Верхне-Кыштымском и Нижне-Кыштымском железоделательных заводах, основанных промышленниками Демидовыми. Является одним из старых горнозаводских центров Урала [citation:1].',
  interestingFacts: [
    'В окрестностях Кыштыма находятся уникальные природные объекты: озеро Увильды, горнолыжный курорт Егоза.',
    'В 1957 году близ города произошла "Кыштымская авария" — радиационная катастрофа на производственном объединении "Маяк".',
    'В городе сохранились памятники заводской архитектуры XIX века.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Коркино',
  categoryCode: 'city',
  lat: 54.89,
  lng: 61.4,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Коркино возникло как поселок при открытом в 1931 году угольном разрезе. В 1942 году получило статус города. Основное предприятие — Коркинский угольный разрез, один из самых глубоких в мире [citation:1].',
  interestingFacts: [
    'Коркинский угольный разрез является одной из главных достопримечательностей города, его глубина достигает 500 метров.',
    'Добыча бурого угля ведется с 1930-х годов.',
    'Город расположен в живописной местности, окруженной лесами и озерами.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Южноуральск',
  categoryCode: 'city',
  lat: 54.44,
  lng: 61.26,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Южноуральск основан в 1948 году в связи со строительством Южноуральской ГРЭС. Статус города получил в 1963 году. Название отражает географическое положение на юге Урала [citation:1].',
  interestingFacts: [
    'Градообразующее предприятие — Южноуральская ГРЭС, одна из крупнейших тепловых электростанций на Урале [citation:1].',
    'В городе находится завод по производству изоляторов и арматуры для высоковольтных линий.',
    'Город расположен на реке Увелька.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Трёхгорный',
  categoryCode: 'city',
  lat: 54.81,
  lng: 58.45,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Трёхгорный — закрытый город (ЗАТО), основанный в 1952 году. Ранее носил названия Златоуст-20 и Златоуст-36. Возник как центр разработки и производства ядерного оружия [citation:1].',
  interestingFacts: [
    'Градообразующее предприятие — Приборостроительный завод, занимающийся разработкой ядерных боеприпасов.',
    'Город находится в окружении гор и лесов, на берегу реки Юрюзань.',
    'Долгое время являлся секретным объектом.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Аша',
  categoryCode: 'city',
  lat: 54.99,
  lng: 57.29,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Аша основана в 1898 году как станция и посёлок при металлургическом заводе, построенном на реке Сим. С 1933 года — город [citation:1].',
  interestingFacts: [
    'Основное предприятие — Ашинский металлургический завод, один из старейших в регионе [citation:8].',
    'Город расположен в живописном месте у входа в горы Южного Урала.',
    'Здесь начинается знаменитая железная дорога, ведущая в горнозаводскую зону.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Еманжелинск',
  categoryCode: 'city',
  lat: 54.76,
  lng: 61.32,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Еманжелинск возник как рабочий поселок при добыче угля. Статус города получил в 1951 году. Название происходит от башкирского "еман" (коза) и "желя" (речка) [citation:1].',
  interestingFacts: [
    'Город был центром добычи угля в Челябинском угольном бассейне.',
    'В окрестностях Еманжелинска находятся многочисленные озера, в том числе озеро Еманжелинское.',
    'Здесь работает одна из крупнейших птицефабрик в области.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Верхний Уфалей',
  categoryCode: 'city',
  lat: 56.06,
  lng: 60.23,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Город возник в 1761 году при Верхнеуфалейском чугуноплавильном и железоделательном заводе, построенном на реке Уфалейка [citation:1].',
  interestingFacts: [
    'В городе находится крупное предприятие — Уфалейникель, занимавшееся добычей и переработкой никелевой руды.',
    'В окрестностях расположен заказник "Уфалейский" с уникальными природными объектами.',
    'Здесь добывали мрамор, который использовался при строительстве московского метро.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Карталы',
  categoryCode: 'city',
  lat: 53.05,
  lng: 60.65,
  geofenceRadiusM: 3000,
  descriptionHistory:
    'Карталы возник в 1810 году как станица Оренбургского казачьего войска. Бурное развитие началось в XX веке с открытием месторождений железной руды и строительством горно-обогатительного комбината. Статус города получил в 1944 году [citation:8].',
  interestingFacts: [
    'Градообразующее предприятие — Карталинский горно-обогатительный комбинат (КГОК), занимающийся добычей железной руды [citation:1].',
    'Город является крупным железнодорожным узлом на линии, ведущей в Казахстан.',
    'В окрестностях Карталов находятся месторождения золота.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Касли',
  categoryCode: 'city',
  lat: 55.89,
  lng: 60.76,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Касли основаны в 1747 году как посёлок при Каслинском железоделательном заводе. Город прославился своим художественным чугунным литьём, которое известно по всему миру [citation:1].',
  interestingFacts: [
    'Каслинское чугунное литьё — уникальный народный промысел, возникший в XIX веке. Изделия каслинских мастеров хранятся в лучших музеях мира.',
    'В городе есть музей каслинского литья.',
    'Касли расположены на берегу озера Большие Касли, входящего в систему озёр, популярных для отдыха.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Катав-Ивановск',
  categoryCode: 'city',
  lat: 54.75,
  lng: 58.2,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Город возник в 1758 году как Катав-Ивановский железоделательный завод, построенный в месте впадения реки Катав в реку Юрюзань [citation:1].',
  interestingFacts: [
    'В городе находится Катав-Ивановский цементный завод, использующий местное сырье.',
    'В окрестностях расположена одна из глубочайших пещер Урала — пещера "Сухая Атя".',
    'Через город проходит старинный Сибирский тракт.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Пласт',
  categoryCode: 'city',
  lat: 54.37,
  lng: 60.82,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Пласт вырос из поселка при золотом руднике, открытом в XIX веке. Статус города получил в 1940 году. Название происходит от геологического термина, обозначающего залегание руды пластом [citation:1].',
  interestingFacts: [
    'Основное предприятие — Пластовский горно-обогатительный комбинат, занимающийся добычей золота и медной руды.',
    'Город находится в центральной части Челябинской области, в окружении лесов и степей.',
    'В окрестностях сохранились старые золотодобывающие шахты.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Сатка',
  categoryCode: 'city',
  lat: 55.064320,
  lng: 59.04,
  geofenceRadiusM: 6300,
  descriptionHistory:
    'Сатка основана в 1758 году как железоделательный завод на реке Сатке. В XIX веке здесь добывали и обрабатывали магнезит, что привело к развитию металлургии [citation:1].',
  interestingFacts: [
    'В Сатке находится крупнейший в России завод по производству огнеупоров (магнезита) — Группа "Магнезит".',
    'Город расположен у подножия хребта Зюраткуль, рядом с одноимённым национальным парком.',
    'Озеро Зюраткуль, находящееся недалеко от города, является одним из самых высокогорных на Урале.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Чебаркуль',
  categoryCode: 'city',
  lat: 54.977790,
  lng: 60.370120,
  geofenceRadiusM: 6300,
  descriptionHistory:
    'Чебаркуль основан в 1736 году как крепость на берегу озера Чебаркуль. В XIX веке стал крупным торговым селом. Статус города получил в 1951 году [citation:1].',
  interestingFacts: [
    'Город известен озером Чебаркуль, в которое в 2013 году упал метеорит, получивший название "Челябинский метеорит".',
    'Чебаркуль также известен своей птицефабрикой и предприятием по производству напитков.',
    'В окрестностях города находятся многочисленные базы отдыха и санатории.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Куса',
  categoryCode: 'city',
  lat: 55.34,
  lng: 59.44,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Куса основана в 1778 году как Кусинский железоделательный завод на реке Кусей. В XIX-XX веках здесь производили высококачественную сталь [citation:1].',
  interestingFacts: [
    'В городе находится известный завод по производству художественного литья и памятников.',
    'Кусинское литьё из чугуна и бронзы ценится по всей России.',
    'Город расположен в живописной горной местности.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Сим',
  categoryCode: 'city',
  lat: 54.99,
  lng: 57.68,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Сим возник в 1761 году при Симском чугуноплавильном и железоделательном заводе, построенном на реке Сим. В XIX веке здесь было организовано производство художественного литья [citation:1].',
  interestingFacts: [
    'В Симе находился дом, где в 1856 году родился известный писатель Дмитрий Наркисович Мамин-Сибиряк.',
    'Город является родиной мамино-сибирского литья из чугуна.',
    'В окрестностях Сима находятся карстовые пещеры, в том числе пещера "Победа".',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Миньяр',
  categoryCode: 'city',
  lat: 55.07,
  lng: 57.56,
  geofenceRadiusM: 2000,
  descriptionHistory:
    'Миньяр основан в 1771 году как железоделательный завод при впадении реки Миньяр в реку Сим. Название происходит от башкирского "мин" (тысяча) и "яр" (крутой берег) [citation:1].',
  interestingFacts: [
    'В XIX веке Миньярский завод производил высококачественное кровельное железо.',
    'Город является живописным местом у подножия Уральских гор, окружен лесами.',
    'В окрестностях Миньяра много карстовых пещер.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Нязепетровск',
  categoryCode: 'city',
  lat: 56.05,
  lng: 59.61,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Нязепетровск основан в 1747 году как Нязе-Петровский железоделательный завод, построенный на реке Нязе. Название дано по реке и в честь Петра I [citation:1].',
  interestingFacts: [
    'В городе находится завод по производству гидротурбинного оборудования, поставляющий продукцию для ГЭС.',
    'Нязепетровск расположен на границе с Башкортостаном, в окружении тайги.',
    'Город является одним из старых горнозаводских центров Урала.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Юрюзань',
  categoryCode: 'city',
  lat: 54.85,
  lng: 58.43,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Юрюзань возникла в 1758 году как Юрюзанский железоделательный завод, основанный купцом Твердышевым на реке Юрюзань [citation:1].',
  interestingFacts: [
    'Город является родиной детского писателя В.В. Бианки, который жил здесь в ссылке и работал в газете.',
    'На реке Юрюзань популярен водный туризм.',
    'Здесь есть фарфоровый завод, известный своей продукцией.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Карабаш',
  categoryCode: 'city',
  lat: 55.49,
  lng: 60.22,
  geofenceRadiusM: 2000,
  descriptionHistory:
    'Карабаш основан в 1822 году как посёлок при золотом руднике. В начале XX века здесь начал работу медеплавильный завод. Название происходит от тюркского "кара баш" — черная голова [citation:1].',
  interestingFacts: [
    'Карабаш известен как один из самых экологически неблагополучных городов из-за деятельности медеплавильного завода.',
    'В настоящее время ведутся работы по экологической реабилитации города.',
    'В окрестностях города находится озеро Большой Кисегач с остатками древних построек.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Бакал',
  categoryCode: 'city',
  lat: 54.94,
  lng: 58.8,
  geofenceRadiusM: 2500,
  descriptionHistory:
    'Бакал возник как рабочий посёлок в 1757 году при Бакальском руднике, где добывали железную руду. Статус города получил в 1951 году [citation:1].',
  interestingFacts: [
    'Главное предприятие — Бакальское рудоуправление, добывающее железную руду открытым способом.',
    'Бакальские рудники являются одними из крупнейших в России.',
    'В окрестностях Бакала находится гора Иркустан с живописными скалами.',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
},
{
  title: 'Локомотивный',
  categoryCode: 'township',
  lat: 53.03,
  lng: 60.14,
  geofenceRadiusM: 2000,
  descriptionHistory:
    'Локомотивный — рабочий посёлок, расположенный в 9 км к северо-востоку от города Карталы. Был образован как военный городок в 1965 году. Статус посёлка городского типа — с 1985 года [citation:1].',
  interestingFacts: [
    'В посёлке дислоцировалась воинская часть железнодорожных войск.',
    'Название посёлка отражает его связь с железнодорожными войсками.',
    'Население — около 8,5 тысяч человек [citation:1].',
  ],
  bestSeason: ['summer','autumn','winter','spring'],
  difficulty: 'easy',
  baseXp: 100,
  requiresProof: false,
  },
  {
    title: 'Гора Круглица',
    categoryCode: 'mountain',
    lat: 55.3173,
    lng: 59.842,
    geofenceRadiusM: 50,
    descriptionHistory:
      'Наивысшая точка (1178 м) всего Таганайского горного массива, центральная вершина хребта Большой Таганай. Название получила за характерную округлую форму.',
    interestingFacts: [
      'Высота — 1178 м, самая высокая точка Таганая',
      'Художник Николай Рерих считал вершину местом особой духовной силы',
      'Склоны почти полностью покрыты каменными россыпями-курумами',
    ],
    bestSeason: ['summer', 'autumn'],
    difficulty: 'hard',
    baseXp: 500,
    requiresProof: true,
  },
  {
    title: 'Откликной гребень',
    categoryCode: 'mountain',
    lat: 55.2958,
    lng: 59.8091,
    geofenceRadiusM: 50,
    descriptionHistory:
      'Одна из вершин хребта Большой Таганай высотой 1155 м. Представляет собой несколько гребенчатых отвесных скал высотой до 100 метров. Является памятником природы.',
    interestingFacts: [
      'Название связано с эхом, возникающим от человеческого голоса на восточном склоне',
      'Высота гребня — 1155 м',
      'У подножия расположены три родника восходящего типа',
    ],
    bestSeason: ['summer', 'autumn'],
    difficulty: 'hard',
    baseXp: 500,
    requiresProof: true,
  },
  {
    title: 'Двуглавая сопка',
    categoryCode: 'mountain',
    lat: 55.2714,
    lng: 59.7781,
    geofenceRadiusM: 50,
    descriptionHistory:
      'Самая южная и ближайшая к Златоусту вершина хребта Большой Таганай, состоящая из двух вершин — «Перья» (1034 м) и «Бараньи лбы» (1041 м).',
    interestingFacts: [
      'Первая вершина, встречающая туристов на входе в парк',
      'У подножия — знаменитый родник Белый Ключ',
      'Южная вершина «Перья» названа за характерные остроконечные скалы',
    ],
    bestSeason: ['summer', 'autumn', 'winter'],
    difficulty: 'medium',
    baseXp: 500,
    requiresProof: false,
  },
  {
    title: 'Семибратка',
    categoryCode: 'mountain',
    lat: 55.132689,
    lng: 59.782096,
    geofenceRadiusM: 50,
    descriptionHistory:
      'Семибратка — группа скалистых останцев на отроге Уральского хребта в национальном парке «Таганай». Здесь проходит экотропа «Путешествие по Европе и Азии»: маршрут длиной около 4 км знакомит с геологией гор и открывает панорамы хребтов и Златоуста.',
    interestingFacts: [
      'Скальные останцы находятся примерно в километре к северу от станции Уржумка.',
      'Экотропа проходит по границе Европы и Азии.',
      'На маршруте есть смотровые площадки и информационные беседки.',
    ],
    bestSeason: ['summer', 'autumn', 'winter', 'spring'],
    difficulty: 'easy',
    baseXp: 500,
    requiresProof: false,
  },
  {
    title: 'Чёрная скала',
    categoryCode: 'mountain',
    lat: 55.27853,
    lng: 59.707539,
    geofenceRadiusM: 50,
    descriptionHistory:
      'Чёрная скала — одна из северных вершин Назминского хребта в национальном парке «Таганай», высотой 853 м. Её скалистый гребень сложен белыми кварцитами и вытянут более чем на 200 м с юга на север; восточный склон круто обрывается вниз.',
    interestingFacts: [
      'Расположена примерно в 12 км к северу от Златоуста.',
      'Экотропа «Весь Таганай за 600 шагов» ведёт к смотровой площадке у скалы.',
      'С 1970-х годов здесь проводят фестиваль бардовской песни «Песня за облака».',
    ],
    bestSeason: ['summer', 'autumn', 'winter', 'spring'],
    difficulty: 'medium',
    baseXp: 500,
    requiresProof: false,
  },
  {
    title: 'Озеро Тургояк',
    categoryCode: 'lake',
    lat: 55.15,
    lng: 60.0667,
    geofenceRadiusM: 2500,
    descriptionHistory:
      'Одно из самых чистых и глубоких озёр Урала, по прозрачности воды сравнимое с Байкалом. Расположено в котловине, окружённой невысокими горами.',
    interestingFacts: [
      'Глубина — до 34 метров',
      'На озере 10-12 островов, самый известный — остров Веры',
      'Вода признана одной из самых прозрачных в России',
    ],
    bestSeason: ['summer'],
    difficulty: 'easy',
    baseXp: 50,
    requiresProof: false,
  },
  {
    title: 'Остров Веры (Тургояк)',
    categoryCode: 'rare',
    lat: 55.1603,
    lng: 60.0336,
    geofenceRadiusM: 150,
    descriptionHistory:
      'Крупнейший остров озера Тургояк с уникальным археологическим комплексом — мегалитами возрастом около 6000 лет.',
    interestingFacts: [
      'Площадь острова — всего 0,08 км²',
      'На острове найдено 38 археологических памятников',
      'Название связано с легендой об инокине Вере, основавшей здесь скит',
    ],
    bestSeason: ['summer'],
    difficulty: 'medium',
    baseXp: 200,
    requiresProof: true,
  },
  {
    title: 'Озеро Зюраткуль',
    categoryCode: 'lake',
    lat: 54.9138,
    lng: 59.2095,
    geofenceRadiusM: 2500,
    descriptionHistory:
      'Самое высокогорное озеро Южного Урала (724 м над уровнем моря), расположено на территории одноимённого национального парка.',
    interestingFacts: [
      'Название переводится с башкирского как "сердце-озеро"',
      'Одно из самых чистых озёр региона, вода пригодна для питья',
      'Рядом — гигантский геоглиф "Лось" возрастом более 8000 лет',
    ],
    bestSeason: ['summer', 'autumn'],
    difficulty: 'easy',
    baseXp: 50,
    requiresProof: false,
  },
  {
    title: 'Аркаим',
    categoryCode: 'historic',
    lat: 52.642811,
    lng: 59.542026,
    geofenceRadiusM: 300,
    descriptionHistory:
      'Укреплённое поселение эпохи бронзы (III—II тыс. до н.э.), один из памятников "Страны городов" Южного Урала. Открыт в 1987 году.',
    interestingFacts: [
      'Отличается уникальной сохранностью оборонительных сооружений',
      'Считается местом силы у эзотериков и последователей альтернативной истории',
      'На территории — музей под открытым небом с реконструкциями',
    ],
    bestSeason: ['summer', 'autumn'],
    difficulty: 'easy',
    baseXp: 200,
    requiresProof: true,
  },
  {
    title: 'Аракульский Шихан',
    categoryCode: 'mountain',
    lat: 55.985,
    lng: 60.4925,
    geofenceRadiusM: 200,
    descriptionHistory:
      'Гранитный скальный массив юго-западнее озера Аракуль. Место со следами стоянок человека раннего бронзового и железного веков.',
    interestingFacts: [
      'Популярное место у скалолазов',
      'Название "шихан" — тюркского происхождения, означает "горка со скалами на вершине"',
      'Рельеф сформирован многовековой работой воды и ветра',
    ],
    bestSeason: ['summer', 'autumn'],
    difficulty: 'medium',
    baseXp: 500,
    requiresProof: true,
  },
  // Временные тестовые секреты около центра Сатки. Координаты и названия
  // специально вынесены отдельными строками, чтобы их было легко заменить.
  ...[
    [55.066320, 59.040000], [55.062320, 59.040000],
    [55.064320, 59.043000], [55.064320, 59.037000],
    [55.066320, 59.043000], [55.062320, 59.037000],
    [55.068320, 59.040000], [55.060320, 59.040000],
    [55.064320, 59.046000], [55.064320, 59.034000],
  ].map(([lat, lng], index) => ({
    title: `Секретная точка ${String(index + 1).padStart(2, '0')} · Сатка`,
    categoryCode: 'secret',
    lat,
    lng,
    geofenceRadiusM: 30,
    descriptionHistory: 'Временная тестовая секретная точка. Замените название и координаты на реальные перед запуском.',
    interestingFacts: ['Эту точку первым сможет открыть только один путешественник.'],
    bestSeason: ['summer', 'autumn', 'spring'],
    difficulty: 'medium' as const,
    baseXp: 0,
    requiresProof: false,
    visibility: 'secret' as const,
  })),
  {
    title: 'Открыть Челябинскую область',
    categoryCode: 'city',
    lat: 55.160058,
    lng: 61.402052,
    geofenceRadiusM: 13000,
    descriptionHistory: 'Это первая точка путешествия по Челябинской области. Добро пожаловать в экспедицию! Исследуй её, чтобы открыть карту и начать собирать собственный туристический паспорт.',
    interestingFacts: ['Стартовая точка для новых путешественников.', 'За открытие начисляется 50 опыта и 50 золота.'],
    bestSeason: ['summer', 'autumn', 'winter', 'spring'],
    difficulty: 'easy',
    baseXp: 50,
    baseCoins: 50,
    requiresProof: false,
  },
  {
    title: 'Гора Большой Иремель',
    categoryCode: 'mountain',
    lat: 54.52195,
    lng: 58.842494,
    geofenceRadiusM: 100,
    descriptionHistory: 'Большой Иремель — одна из высочайших вершин Южного Урала, расположенная в природном парке «Иремель». Его платообразная вершина Кабан поднимается примерно до 1582 м. Маршрут проходит по горной местности и требует подготовки к переменчивой погоде.',
    interestingFacts: [
      'Большой Иремель вместе с Малым Иремелем образует горный массив Иремель.',
      'Парк «Иремель» создан для охраны природных комплексов и развития экологического туризма.',
    ],
    bestSeason: ['summer', 'autumn'],
    difficulty: 'hard',
    baseXp: 500,
    baseCoins: 1000,
    requiresProof: false,
  },
  {
    title: 'Курорт «Солнечная долина»',
    categoryCode: 'park',
    lat: 55.043009,
    lng: 59.962879,
    geofenceRadiusM: 150,
    descriptionHistory: '«Солнечная долина» — всесезонный горнолыжный курорт в окрестностях Миасса. Зимой здесь работают горнолыжные трассы и сноу-парк, а в тёплый сезон доступны прогулки, подъём на гору Известную и другие виды отдыха.',
    interestingFacts: [
      'На курорте проводят соревнования по зимним видам спорта.',
      'Летом доступны прогулки на подъёмнике и маршруты по окрестностям.',
    ],
    bestSeason: ['summer', 'autumn', 'winter', 'spring'],
    difficulty: 'easy',
    baseXp: 200,
    baseCoins: 200,
    requiresProof: false,
  },

  // Новые точки Челябинска из пользовательского списка. Источники и координаты
  // приведены в приложенном списке; музеи и исторические места получают базовую
  // награду городского объекта: 150 XP и 300 золота.
  // Музеи
  {
    title: 'Исторический музей Южного Урала',
    categoryCode: 'museum',
    lat: 55.168068,
    lng: 61.397148,
    geofenceRadiusM: 60,
    descriptionHistory: 'Музей Южного Урала на улице Труда знакомит посетителей с историей и культурой региона.',
    interestingFacts: ['Музей расположен в центре Челябинска.', 'Адрес: улица Труда, 100.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Челябинский государственный музей изобразительных искусств',
    categoryCode: 'museum',
    lat: 55.159370,
    lng: 61.404131,
    geofenceRadiusM: 60,
    descriptionHistory: 'Государственный музей изобразительных искусств на площади Революции хранит художественные коллекции и проводит выставки.',
    interestingFacts: ['Музей находится на площади Революции, 1.', 'В коллекции представлены произведения искусства разных эпох.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Центр исторического наследия Южно-Уральской железной дороги',
    categoryCode: 'museum',
    lat: 55.136928,
    lng: 61.413360,
    geofenceRadiusM: 60,
    descriptionHistory: 'Музейный центр рассказывает об истории Южно-Уральской железной дороги и развитии железнодорожного транспорта региона.',
    interestingFacts: ['Центр расположен на Железнодорожной улице, 11.', 'Экспозиция посвящена железнодорожному наследию Южного Урала.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Исторический парк «Россия — Моя история»',
    categoryCode: 'museum',
    lat: 55.168044,
    lng: 61.374894,
    geofenceRadiusM: 80,
    descriptionHistory: 'Мультимедийный исторический парк знакомит с событиями российской истории с помощью интерактивных экспозиций.',
    interestingFacts: ['Парк расположен на улице Труда, 183.', 'В экспозициях используются мультимедийные форматы.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Музей леса',
    categoryCode: 'museum',
    lat: 55.141429,
    lng: 61.367757,
    geofenceRadiusM: 50,
    descriptionHistory: 'Музей леса посвящён природе Южного Урала и лесному хозяйству.',
    interestingFacts: ['Адрес музея: Варненская улица, 1а.', 'Название и музейный профиль указаны в каталоге 2ГИС.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Музей зерна',
    categoryCode: 'museum',
    lat: 55.168054,
    lng: 61.385370,
    geofenceRadiusM: 50,
    descriptionHistory: 'Музей зерна рассказывает о выращивании и переработке зерновых культур.',
    interestingFacts: ['Музей находится на Свердловском проспекте, 40а/2.', 'Объект отмечен как музей в каталоге 2ГИС.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Музей СВО',
    categoryCode: 'museum',
    lat: 55.161576,
    lng: 61.401126,
    geofenceRadiusM: 50,
    descriptionHistory: 'Интерактивный музей на улице Кирова посвящён событиям специальной военной операции и её участникам.',
    interestingFacts: ['Музей расположен по адресу: улица Кирова, 167.', 'Название и интерактивный формат указаны в карточке 2ГИС.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Дом сказки',
    categoryCode: 'museum',
    lat: 55.154052,
    lng: 61.405929,
    geofenceRadiusM: 60,
    descriptionHistory: '«Дом сказки» — интерактивный театр-музей в Городском саду имени А. С. Пушкина.',
    interestingFacts: ['Площадка расположена в городском саду.', 'Адрес: улица Цвиллинга, 50/1.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'МотоЭпоха',
    categoryCode: 'museum',
    lat: 55.157347,
    lng: 61.498239,
    geofenceRadiusM: 60,
    descriptionHistory: 'Музей «МотоЭпоха» знакомит с историей мотоциклов и развитием мототехники.',
    interestingFacts: ['Музей находится на Линейной улице, 86 к2.', 'Профиль музея указан в карточке 2ГИС.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'ЧТЗ-Уралтрак — музей трудовой и боевой славы',
    categoryCode: 'museum',
    lat: 55.160321,
    lng: 61.433882,
    geofenceRadiusM: 60,
    descriptionHistory: 'Музей трудовой и боевой славы ЧТЗ-Уралтрак посвящён истории предприятия и людям, которые на нём работали.',
    interestingFacts: ['Музей расположен на проспекте Ленина, 19.', 'Экспозиция связана с трудовой и боевой историей Челябинского тракторного завода.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },

  // Архитектура и исторические места
  {
    title: 'Дом купца И. Бусыгина',
    categoryCode: 'historic',
    lat: 55.165528,
    lng: 61.401872,
    geofenceRadiusM: 40,
    descriptionHistory: 'Усадьба купца Ивана Бусыгина датируется 1860-ми годами. По данным карточки 2ГИС, это самый старый сохранившийся полукаменный двухэтажный дом Челябинска.',
    interestingFacts: ['Дом расположен на улице Маркса, 70.', 'Объект обозначен как выявленный объект культурного наследия.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Дом купца Н. А. Самохвалова',
    categoryCode: 'historic',
    lat: 55.167297,
    lng: 61.399878,
    geofenceRadiusM: 40,
    descriptionHistory: 'Дом на улице Кирова сначала предназначался для магазина, а затем стал главным жилым домом купца Самохвалова.',
    interestingFacts: ['Адрес: улица Кирова, 82.', 'В карточке 2ГИС объект обозначен как выявленный объект культурного наследия.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Дом купца Г. Н. Каширина',
    categoryCode: 'historic',
    lat: 55.168618,
    lng: 61.410390,
    geofenceRadiusM: 40,
    descriptionHistory: 'Каменный купеческий дом с торговой лавкой на первом этаже построен в 1885 году.',
    interestingFacts: ['Адрес: улица Свободы, 14 / улица Труда, 62.', 'Объект имеет статус культурного наследия регионального значения.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Дом купца И. А. Иванова (историческое место)',
    categoryCode: 'historic',
    lat: 55.164535,
    lng: 61.399969,
    geofenceRadiusM: 40,
    descriptionHistory: 'Исторический адрес дома купца И. А. Иванова на улице Кирова. По карточке 2ГИС, в начале 2000-х на этом месте возвели новое здание, поэтому точка отмечает именно историческое место, а не подтверждает сохранность прежнего дома.',
    interestingFacts: ['Адрес: улица Кирова, 94.', 'В карточке указан кирпичный нижний этаж и бревенчатый верх исторического здания.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Дом купца С. Т. Шарлова',
    categoryCode: 'historic',
    lat: 55.163982,
    lng: 61.400293,
    geofenceRadiusM: 40,
    descriptionHistory: 'Двухэтажный каменный дом купца С. Т. Шарлова выделяется симметричным фасадом и декоративным кокошником.',
    interestingFacts: ['Адрес: улица Кирова, 100.', 'Объект обозначен как выявленный объект культурного наследия.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Дом купца В. П. Комольцева',
    categoryCode: 'historic',
    lat: 55.164132,
    lng: 61.400296,
    geofenceRadiusM: 40,
    descriptionHistory: 'Купеческий дом В. П. Комольцева построен в 1897 году. На первом этаже размещались магазины сельскохозяйственных товаров и посуды.',
    interestingFacts: ['Адрес: улица Кирова, 98.', 'Дом относится к исторической купеческой застройке Челябинска.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Магазин М. Ф. Валеева',
    categoryCode: 'historic',
    lat: 55.163086,
    lng: 61.400304,
    geofenceRadiusM: 40,
    descriptionHistory: 'Крупное дореволюционное торговое здание на улице Кирова открылось в 1911 году. Его построили в стиле модерн с элементами эклектики по проекту архитектора А. А. Фёдорова.',
    interestingFacts: ['Адрес: улица Кирова, 104.', 'Здание связано с историей купеческой торговли Челябинска.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Дом купца Н. И. Каширина',
    categoryCode: 'historic',
    lat: 55.168064,
    lng: 61.410513,
    geofenceRadiusM: 40,
    descriptionHistory: 'Купеческий дом с торговой лавкой связан с историей семьи Кашириных и старой застройкой Челябинска.',
    interestingFacts: ['Адрес: улица Труда, 75а / улица Свободы, 16.', 'Объект имеет статус культурного наследия регионального значения.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Усадьба Рябинина',
    categoryCode: 'historic',
    lat: 55.173422,
    lng: 61.395342,
    geofenceRadiusM: 50,
    descriptionHistory: 'Особняк купца Рябинина перестроили в 1911–1916 годах в стиле псевдорусской теремной архитектуры.',
    interestingFacts: ['Адрес: Каслинская улица, 137.', 'Усадьба является памятником архитектуры регионального значения.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
  {
    title: 'Дом Мотовилова-Пантегова',
    categoryCode: 'historic',
    lat: 55.167229,
    lng: 61.403917,
    geofenceRadiusM: 40,
    descriptionHistory: 'Южная часть дома была построена Андреем Мотовиловым до 1841 года. Позднее здание расширяли; в разное время здесь размещались общественное собрание, дом трудолюбия и городская биржа.',
    interestingFacts: ['Адрес: улица Цвиллинга, 5.', 'Объект имеет статус культурного наследия регионального значения.'],
    bestSeason: ['spring', 'summer', 'autumn', 'winter'],
    difficulty: 'easy',
    baseXp: 150,
    baseCoins: 300,
    baseCrystals: 0,
    requiresProof: false,
  },
];
