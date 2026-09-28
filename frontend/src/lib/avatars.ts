export const AVATARS = Array.from({ length: 22 }, (_, index) => ({
  id: index + 1,
  src: `/assets/avatars/${index + 1}.jpg`,
  price: index === 20 ? 100 : index === 21 ? 200 : 0,
}));

export const FREE_AVATARS = AVATARS.filter((avatar) => avatar.price === 0);
export const PAID_AVATARS = AVATARS.filter((avatar) => avatar.price > 0);

// Старые аккаунты и клиенты могли сохранить emoji. Оставляем их отображение,
// а новые регистрации выбирают иллюстрированный набор из FREE_AVATARS.
export const LEGACY_AVATAR_EMOJIS = [
  '🙂', '😎', '🥳', '🤠', '🧗', '🏕️', '⛰️', '🌲', '🦊', '🐺',
  '🦉', '🐻', '🦌', '🐿️', '🍁', '🔥', '🧭', '🎒', '⛺', '🌄',
];

export function avatarPath(id: number) {
  return AVATARS[id - 1]?.src;
}
