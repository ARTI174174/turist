import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { completedExpeditionSteps, expeditionMonth, selectMonthlyPoints } from '../src/game/monthly-expedition';
import { CATEGORY_QUESTS, countQuestVisits } from '../src/progression/category-quests';
import { validateFlagDesign } from '../src/flags/flag-design';
import { POI_CATALOG } from '../prisma/poi-data';

const catalogue = ['city', 'lake', 'mountain'].flatMap((code) => Array.from({ length: 12 }, (_, i) => ({ id: `${code}-${i}`, category: { code } })));

test('месяц меняется ровно в полночь Екатеринбурга, включая смену года', () => {
  assert.equal(expeditionMonth(new Date('2026-10-31T18:59:59Z')).monthKey, '2026-10');
  const next = expeditionMonth(new Date('2026-10-31T19:00:00Z'));
  assert.equal(next.monthKey, '2026-11');
  assert.equal(next.startsAt.toISOString(), '2026-10-31T19:00:00.000Z');
  assert.equal(next.endsAt.toISOString(), '2026-11-30T19:00:00.000Z');
  assert.equal(expeditionMonth(new Date('2026-12-31T19:00:00Z')).monthKey, '2027-01');
});

test('маршрут общий, без повторов, ровно 7 городов, 7 озёр и 7 гор', () => {
  const ids = selectMonthlyPoints('2026-10', catalogue)!;
  assert.equal(new Set(ids).size, 21);
  assert.ok(ids.slice(0, 7).every((id) => id.startsWith('city-')));
  assert.ok(ids.slice(7, 14).every((id) => id.startsWith('lake-')));
  assert.ok(ids.slice(14).every((id) => id.startsWith('mountain-')));
  assert.deepEqual(selectMonthlyPoints('2026-10', [...catalogue].reverse()), ids);
  assert.notDeepEqual(selectMonthlyPoints('2026-11', catalogue), ids);
});

test('недостающие озёра не подменяются городами', () => {
  assert.equal(selectMonthlyPoints('2026-10', catalogue.filter((p) => !p.id.startsWith('lake-') || Number(p.id.slice(5)) < 6)), null);
});

test('прошлые посещения засчитываются, пропущенная точка удерживает следующий этап', () => {
  const ids = selectMonthlyPoints('2026-10', catalogue)!;
  assert.equal(completedExpeditionSteps(ids, new Set(ids)), 21);
  assert.equal(completedExpeditionSteps(ids, new Set(ids.filter((_, i) => i !== 6))), 6);
  assert.equal(completedExpeditionSteps(ids, new Set(ids.slice(0, 14))), 14);
});

test('фотографу считаются только фототочки; музей и памятник суммируются', () => {
  const visits = ['city', 'photo', 'museum', 'monument', 'historic', 'photo'];
  assert.equal(countQuestVisits(CATEGORY_QUESTS[0].categories, visits), 2);
  assert.equal(countQuestVisits(CATEGORY_QUESTS[2].categories, visits), 2);
  assert.equal(countQuestVisits(CATEGORY_QUESTS[6].categories, visits), 1);
});

test('новые фототочки сохраняют заданные координаты и награды', () => {
  const photos = POI_CATALOG.filter((p) => p.categoryCode === 'photo');
  assert.equal(photos.length, 6);
  assert.deepEqual(photos.map((p) => [p.lat, p.lng]), [[55.03448, 59.024104], [54.993937, 57.712373], [55.17246, 59.678186], [55.050932, 60.093779], [53.384606, 58.952378], [52.71958, 58.921285]]);
  assert.ok(photos.every((p) => p.baseXp === 300 && p.baseCoins === 300));
  const route = selectMonthlyPoints('2026-10', POI_CATALOG.filter((p) => p.title !== 'Открыть Челябинскую область' && (!p.visibility || p.visibility === 'public')).map((p) => ({ id: p.title, category: { code: p.categoryCode } })));
  assert.equal(route?.length, 21);
});

test('старые флаги читаются вместе со свободными штрихами', () => {
  const parts = [{ type: 'circle', x: 50, y: 40, r: 10, color: '#E74C3C' }, { type: 'stroke', points: [[20, 20], [40, 30]], width: 4, color: '#3498DB' }];
  assert.deepEqual(validateFlagDesign(parts), parts);
});

test('рисунок отвергает внедрение строк, недопустимые размеры и слишком большой объём', () => {
  const stroke = { type: 'stroke', points: [[20, 20]], width: 4, color: '#3498DB' };
  assert.throws(() => validateFlagDesign([{ ...stroke, width: 100 }]));
  assert.throws(() => validateFlagDesign([{ ...stroke, points: [['20', 20]] }]));
  assert.throws(() => validateFlagDesign([{ ...stroke, points: [[Infinity, 20]] }]));
  assert.throws(() => validateFlagDesign([{ ...stroke, color: '"><script>' }]));
  assert.throws(() => validateFlagDesign(Array.from({ length: 65 }, () => stroke)));
  assert.throws(() => validateFlagDesign(Array.from({ length: 9 }, () => ({ ...stroke, points: Array.from({ length: 256 }, () => [20, 20]) }))));
});
