import { IsOptional, IsString } from 'class-validator';

export class TestDeliveryIntegrationDto {
  @IsOptional()
  @IsString()
  trackingCode?: string;
}
