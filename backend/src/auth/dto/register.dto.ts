import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export const LEGACY_AVATAR_EMOJIS = [
  '🙂', '😎', '🥳', '🤠', '🧗', '🏕️', '⛰️', '🌲', '🦊', '🐺',
  '🦉', '🐻', '🦌', '🐿️', '🍁', '🔥', '🧭', '🎒', '⛺', '🌄',
] as const;

export const FREE_AVATARS = Array.from({ length: 20 }, (_, index) => `/assets/avatars/${index + 1}.jpg`);
export const PAID_AVATARS = ['/assets/avatars/21.jpg', '/assets/avatars/22.jpg'] as const;

export class RegisterDto {
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Ник может содержать только латинские буквы, цифры и подчёркивание',
  })
  nickname: string;

  @IsString()
  @Length(8, 100)
  password: string;

  @IsString()
  @IsIn(['male', 'female'])
  archetype: 'male' | 'female';

  @IsOptional()
  @IsString()
  @IsIn([...FREE_AVATARS, ...LEGACY_AVATAR_EMOJIS], { message: 'Недопустимый аватар' })
  avatarEmoji?: string;

  @IsString()
  @IsIn(['zyuratkul', 'nurgush', 'taganay', 'ural'], { message: 'Выберите один из доступных лагерей' })
  campThemeId: string;

  @IsString()
  challengeId: string;

  @IsInt()
  @Min(0)
  @Max(100)
  challengeAnswer: number;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  proofCounter: number;
}
