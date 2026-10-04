import { PrismaService } from './prisma/prisma.service';

export type UpgradeKind = 'glasses' | 'gloves';
export type UpgradeSetting = { kind: UpgradeKind; level: number; effectValue: number; priceCoins: number };

const DEFAULTS: Record<UpgradeKind, Array<{ effectValue: number; priceCoins: number }>> = {
  glasses: [
    { effectValue: 500, priceCoins: 0 }, { effectValue: 1000, priceCoins: 10000 },
    { effectValue: 2000, priceCoins: 20000 }, { effectValue: 5000, priceCoins: 50000 },
    { effectValue: 10000, priceCoins: 100000 },
  ],
  gloves: [
    { effectValue: 0, priceCoins: 0 }, { effectValue: 50, priceCoins: 10000 },
    { effectValue: 100, priceCoins: 20000 }, { effectValue: 150, priceCoins: 50000 },
    { effectValue: 200, priceCoins: 100000 },
  ],
};

export async function getUpgradeSettings(prisma: PrismaService, kind: UpgradeKind): Promise<UpgradeSetting[]> {
  const saved = await prisma.shopUpgradeConfig.findMany({ where: { kind }, orderBy: { level: 'asc' } });
  return DEFAULTS[kind].map((fallback, level) => {
    const row = saved.find((item) => item.level === level);
    return { kind, level, effectValue: row?.effectValue ?? fallback.effectValue, priceCoins: row?.priceCoins ?? fallback.priceCoins };
  });
}

export async function getUpgradeEffect(prisma: PrismaService, kind: UpgradeKind, level: number): Promise<number> {
  const defaults = DEFAULTS[kind][level] ?? DEFAULTS[kind][0];
  const row = await prisma.shopUpgradeConfig.findUnique({ where: { kind_level: { kind, level } } });
  return row?.effectValue ?? defaults.effectValue;
}

export function defaultUpgradeSettings(): UpgradeSetting[] {
  return (Object.keys(DEFAULTS) as UpgradeKind[]).flatMap((kind) =>
    DEFAULTS[kind].map((setting, level) => ({ kind, level, ...setting })),
  );
}
