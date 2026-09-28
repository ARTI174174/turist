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
    <nav className="bottom-nav" aria-label="Основная навигация">
      <div className="bottom-nav-plaque">
        {TABS.map(({ href, label, icon, primary }) => {
          const active = pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={clsx('bottom-nav-item', primary && 'bottom-nav-item-primary', active && 'bottom-nav-item-active')}
              aria-current={active ? 'page' : undefined}
            >
              {primary ? (
                <span className="bottom-nav-center">
                  <img src={icon} alt="" />
                </span>
              ) : (
                <img src={icon} alt="" className="bottom-nav-icon" />
              )}
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
