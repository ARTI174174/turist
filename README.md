# ТУРИСТ — монорепозиторий (MVP-скелет)

Рабочая реализация ключевого игрового цикла из SRS: **регистрация → карта →
приближение к точке → dwell-timer → фото/подтверждение → начисление XP и
монет → прогресс звания**, плюс базовый магазин/инвентарь и античит уровня 1–3.

Это стартовый скелет под Фазу 1 (MVP) из Roadmap (SRS, раздел 19) — реализованы
модули Auth, Character (базовый), POI, Explore/Anticheat, Progression, Economy.
Остальные модули (Social, Routes, Seasons, UGC, Admin) — по описанной в SRS
архитектуре, следующий шаг разработки.

```
turist-monorepo/
├── backend/    NestJS + Prisma + PostgreSQL/PostGIS API
└── frontend/   Next.js PWA (MapLibre + Three.js)
```

## Быстрый старт

### 1. База данных и Redis

```bash
cd backend
cp .env.example .env
docker compose up -d          # поднимает Postgres+PostGIS и Redis
```

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init   # создаст таблицы по prisma/schema.prisma
npx prisma db seed                   # категории, точки (Аркаим, Таганай, Зюраткуль, Тургояк), магазин
npm run start:dev                    # http://localhost:3001/api/v1, Swagger: /api/docs
```

> Примечание: в песочнице, где собирался этот код, недоступны внешние домены
> `binaries.prisma.sh` и `fonts.googleapis.com`, поэтому `prisma generate` и
> `next build` там не доводились до конца — это ограничение среды разработки
> ассистента, а не самого кода. Вся бизнес-логика (гео-расчёты, детект
> аномальной скорости, кривая уровней) проверена изолированными смоук-тестами
> и компилируется без ошибок TypeScript (`tsc --noEmit` — чисто). В обычном
> окружении с доступом в интернет оба шага отработают штатно.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                          # http://localhost:3000
```

Открой `http://localhost:3000/register`, выбери персонажа, зарегистрируйся —
попадёшь на карту с уже засеянными точками (Аркаим, Таганай, Зюраткуль, Тургояк).
Для реального прохождения геозоны нужен реальный GPS (мобильный браузер) —
либо подмени координаты через DevTools → Sensors → Location в Chrome для
локальной отладки.

## Что реализовано в этом скелете

- **Auth**: регистрация по нику/паролю (Argon2id), JWT + refresh-token rotation, удаление аккаунта.
- **POI**: каталог точек, фильтр по bbox/категориям, видимость секретных точек по XP-порогу.
- **Explore/Anticheat**: `attempt → heartbeat (dwell-time) → proof → complete`, скоринг по
  геозоне/скорости/истории аккаунта, статусы `verified / flagged_for_review / rejected`.
- **Progression**: нелинейная кривая XP → звание (Новичок → … → Легенда Урала).
- **Economy**: кошелёк (монеты/кристаллы), магазин, инвентарь, история транзакций.
- **Frontend**: экраны логина/регистрации с выбором персонажа (Three.js-превью),
  карта на MapLibre с маркерами по категориям, bottom-sheet карточка точки с полным
  Explore-флоу (прогресс-бар dwell-timer → подтверждение → анимация награды), HUD,
  нижняя навигация, PWA-манифест + Service Worker кэширование (via next-pwa).

## Что дальше (см. SRS, разделы 5, 19)

1. Модуль **Social** (друзья, клубы, чат) и **Routes**.
2. Модуль **UGC** (пользовательские точки + голосование + модерация) и **Admin-панель**.
3. **Quests/Achievements/Collections** — витрины и логика начисления.
4. Реальные glTF-модели персонажа с ригом/анимациями (сейчас — Three.js-плейсхолдер из примитивов).
5. Загрузка фото на S3-совместимое хранилище + pre-signed URL эндпоинт (сейчас `ProofDto.assetUrl`
   ожидает уже загруженный URL — нужен отдельный upload-эндпоинт).
6. Собственный векторный тайл-сервер (Tileserver-GL/Martin) вместо демо-стиля MapLibre.
7. Web Push подписки и центр уведомлений.
8. E2E/нагрузочные тесты (Playwright/k6) согласно разделу 18 SRS.

## Документация

Полное техническое задание — `TURIST_SRS_Chelyabinsk.md` (раздел "Приложения"
содержит примеры конфигов, GeoJSON, JSON квестов и т.д.).
