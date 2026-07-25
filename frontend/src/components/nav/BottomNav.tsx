'use client';

import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';

const TABS = [
  { href: '/profile', label: 'Профиль', icon: '/assets/icons/profile.png' },
  { href: '/', label: 'Лагерь', icon: '/assets/icons/camp.png' },
  { href: '/map', label: 'В путь', icon: '/assets/icons/go.png', primary: true },
  { href: '/passport', label: 'Дневник', icon: '/assets/icons/diary.png' },
  { href: '/social', label: 'Друзья', icon: '/assets/icons/friends.png' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex items-end justify-around bg-contain bg-bottom bg-no-repeat pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-4"
      style={{ backgroundImage: "url('/assets/icons/nav-bar.png')" }}
      aria-label="Основная навигация"
    >
      {TABS.map(({ href, label, icon, primary }) => {
        const active = pathname === href;
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={clsx(
              'flex min-w-[56px] flex-col items-center gap-1 text-[10px] transition-transform',
              primary && '-translate-y-3',
              active ? 'text-amber' : 'text-parchment/70',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <img src={icon} alt="" className={primary ? 'h-12 w-12' : 'h-7 w-7'} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
