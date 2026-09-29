import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class PublishNewsDto {
  @IsString() @MaxLength(120) title: string;
  @IsString() @MaxLength(5000) body: string;
}

export class BuyUpgradeDto {
  @IsString() @MaxLength(20) kind: string;
  @IsInt() @Min(1) @Max(4) level: number;
}
