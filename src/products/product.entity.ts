import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

export enum ProductStatus {
  PUBLISHED = 'affiche',
  HIDDEN = 'cache',
  OUT_OF_STOCK = 'rupture',
  LINK_ONLY = 'lien',
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  slug: string;

  @Prop({ default: '' })
  sku: string;

  @Prop({ default: 0 })
  price: number;

  @Prop({ default: 0 })
  oldPrice: number;

  @Prop({ default: 0 })
  cost: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: 0 })
  stock: number;

  @Prop({
    type: String,
    enum: Object.values(ProductStatus),
    default: ProductStatus.PUBLISHED,
  })
  status: ProductStatus;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ default: '' })
  description: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
