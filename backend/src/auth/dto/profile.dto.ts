import { IsIn, IsString, Length, Matches } from 'class-validator';
import { FREE_AVATARS, LEGACY_AVATAR_EMOJIS, PAID_AVATARS } from './register.dto';

export class ChangeNicknameDto {
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Ник может содержать только латинские буквы, цифры и подчёркивание',
  })
  nickname: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Length(8, 100)
  newPassword: string;
}

export class ChangeAvatarDto {
  @IsString()
  @IsIn([...FREE_AVATARS, ...PAID_AVATARS, ...LEGACY_AVATAR_EMOJIS], { message: 'Недопустимый аватар' })
  avatarEmoji: string;
}
