import { IsBoolean, IsNumberString, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateDeliveryIntegrationDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  apiCode?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  shippingCost?: string;

  @IsOptional()
  @IsString()
  returnCost?: string;

  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  storePhone?: string;

  @IsOptional()
  @IsString()
  storeAddress?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsNumberString()
  defaultPieceSize?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, string | number | boolean>;
}
