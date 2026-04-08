import { IsString, IsOptional, IsNumber, IsArray, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProductStatus } from '../product.entity';

const toArray = ({ value }: { value: any }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === 'string') {
    // JSON array string?
    if (value.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
      } catch {}
    }
    // single value
    return [value];
  }
  return [String(value)];
};

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  oldPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deliveryFee?: number;
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsArray()
  @Transform(toArray)
  categories?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}