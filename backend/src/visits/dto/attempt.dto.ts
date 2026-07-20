import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class StartAttemptDto {
  @IsString()
  poiId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  accuracyM?: number;
}

export class HeartbeatDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  accuracyM?: number;
}

export class ProofDto {
  @IsString()
  proofType: 'photo' | 'selfie' | 'qr';

  @IsString()
  assetUrl: string; // в MVP — URL уже загруженного в S3 файла; клиент грузит файл отдельным запросом на pre-signed URL
}

export class UpdateNoteDto {
  @IsString()
  @MaxLength(50, { message: 'Заметка не может быть длиннее 50 символов' })
  note: string;
}
