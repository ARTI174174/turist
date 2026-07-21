import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class SearchUserDto {
  @IsString()
  @Length(3, 20)
  nickname: string;
}

export class SendFriendRequestDto {
  @IsString()
  @Length(3, 20)
  nickname: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500, { message: 'Сообщение не может быть длиннее 500 символов' })
  content: string;
}
