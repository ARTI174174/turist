import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class QueryPoiDto {
  // bbox = minLng,minLat,maxLng,maxLat
  @IsOptional()
  @IsString()
  bbox?: string;

  @IsOptional()
  @IsString()
  categories?: string; // csv кодов категорий

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusM?: number;
}
