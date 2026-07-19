'use client';

import { Map, ListChecks, ShoppingBag, BookUser, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';

const TABS = [
  { href: '/', label: 'Карта', icon: Map },
  { href: '/quests', label: 'Задания', icon: ListChecks },
  { href: '/shop', label: 'Магазин', icon: ShoppingBag },
  { href: '/passport', label: 'Паспорт', icon: BookUser },
  { href: '/social', label: 'Друзья', icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-black/10 bg-forest/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.25)] backdrop-blur"
      aria-label="Основная навигация"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={clsx(
              'flex min-w-[64px] flex-col items-center gap-1 px-2 py-2.5 text-[11px] transition-colors',
              active ? 'text-amber' : 'text-parchment/60',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
