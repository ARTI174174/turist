export interface AchievementNotice {
  title: string;
  description: string;
  reward?: string;
  image?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

const EVENT_NAME = 'tourist:achievement-notice';

export function announceAchievement(notice: AchievementNotice) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AchievementNotice>(EVENT_NAME, { detail: notice }));
}

export function subscribeToAchievementNotices(listener: (notice: AchievementNotice) => void) {
  const handleNotice = (event: Event) => {
    listener((event as CustomEvent<AchievementNotice>).detail);
  };
  window.addEventListener(EVENT_NAME, handleNotice);
  return () => window.removeEventListener(EVENT_NAME, handleNotice);
}
