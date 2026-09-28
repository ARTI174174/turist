import { IsString, Length } from 'class-validator';

export class CreatePoiCommentDto {
  @IsString()
  @Length(1, 500)
  text: string;
}
