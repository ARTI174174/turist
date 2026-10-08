import { BadRequestException } from '@nestjs/common';

export const FLAG_COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C', '#3498DB', '#3F51B5', '#9B59B6', '#EC407A', '#F5F5F5'];
export type FlagShape = { type: 'circle'; x: number; y: number; r: number; color: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string }
  | { type: 'stroke'; points: number[][]; width: number; color: string };

export function validateFlagDesign(raw: unknown): FlagShape[] {
  if (!Array.isArray(raw) || raw.length > 64) throw new BadRequestException('На флаге можно нарисовать до 64 штрихов.');
  let pointCount = 0;
  const number = (value: unknown, min = 0, max = 100) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new BadRequestException('Параметры рисунка вне допустимых границ.');
    return Math.round(value * 100) / 100;
  };
  return raw.map((entry): FlagShape => {
    if (!entry || typeof entry !== 'object' || !FLAG_COLORS.includes(entry.color)) throw new BadRequestException('Выберите цвет из палитры флага.');
    if (entry.type === 'circle') return { type: 'circle', x: number(entry.x), y: number(entry.y), r: number(entry.r, 2, 20), color: entry.color };
    if (entry.type === 'line') return { type: 'line', x1: number(entry.x1), y1: number(entry.y1), x2: number(entry.x2), y2: number(entry.y2), color: entry.color };
    if (entry.type === 'stroke') {
      if (!Array.isArray(entry.points) || entry.points.length < 1 || entry.points.length > 256) throw new BadRequestException('Штрих должен содержать от 1 до 256 точек.');
      pointCount += entry.points.length;
      if (pointCount > 2048) throw new BadRequestException('Рисунок слишком подробный. Удалите несколько штрихов.');
      return { type: 'stroke', width: number(entry.width, 1, 12), color: entry.color, points: entry.points.map((point: unknown) => {
        if (!Array.isArray(point) || point.length !== 2) throw new BadRequestException('Некорректный штрих.');
        return [number(point[0]), number(point[1])];
      }) };
    }
    throw new BadRequestException('Неизвестный инструмент рисования.');
  });
}
