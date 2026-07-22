import { IsNumber } from 'class-validator';

export class CollectCrystalDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
