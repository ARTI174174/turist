import { IsNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class QuickSubmissionDto {
  @IsString()
  @MinLength(10, { message: 'Опишите место подробнее — минимум 10 символов' })
  @MaxLength(50, { message: 'Описание не может быть длиннее 50 символов' })
  description: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
