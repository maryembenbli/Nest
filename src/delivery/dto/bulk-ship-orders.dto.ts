import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class BulkShipOrdersDto {
  @IsString()
  providerKey: string;

  @IsArray()
  @ArrayNotEmpty()
  orderIds: string[];
}
