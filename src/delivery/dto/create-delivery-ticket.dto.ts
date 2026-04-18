import { IsOptional, IsString } from 'class-validator';

export class CreateDeliveryTicketDto {
  @IsString()
  motif: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
