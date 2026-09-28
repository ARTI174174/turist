import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export const ALLOWED_AVATAR_EMOJIS = [
  '🙂', '😎', '🥳', '🤠', '🧗', '🏕️', '⛰️', '🌲', '🦊', '🐺',
  '🦉', '🐻', '🦌', '🐿️', '🍁', '🔥', '🧭', '🎒', '⛺', '🌄',
] as const;

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
  @IsIn(ALLOWED_AVATAR_EMOJIS as unknown as string[], { message: 'Недопустимый аватар' })
  avatarEmoji?: string;
}
