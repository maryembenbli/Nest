import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  REJECTED = 'rejetee',
  PENDING = 'en_attente',
  ATTEMPT1 = 'tentative1',
  CONFIRMED = 'confirmee',
  PACKED = 'emballee',
  DELIVERED = 'livree',
  RETURNED = 'retournee',
}

export enum RejectReason {
  NOT_AVAILABLE = 'not_available',
  EXPENSIVE = 'expensive',
  DIDNT_CLICK = 'didnt_click_buy',
  BETTER_PRICE = 'better_price',
  EXPENSIVE_DELIVERY = 'expensive_delivery',
  OTHER = 'other',
}

@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  deliveryFee: number;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema()
export class OrderHistory {
  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    required: true,
  })
  status: OrderStatus;

  @Prop({ required: true })
  changedBy: string;

  @Prop()
  note?: string;

  @Prop({ default: Date.now })
  date: Date;
}

const OrderHistorySchema = SchemaFactory.createForClass(OrderHistory);

@Schema({ timestamps: true })
export class Order {
  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Prop({
    type: String,
    enum: Object.values(RejectReason),
  })
  rejectReason?: RejectReason;

  @Prop({ default: '' })
  deliveryCompany: string;

  @Prop({ default: '' })
  privateNote: string;

  @Prop({ default: false })
  exchange: boolean;

  @Prop({ default: '' })
  customerName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ default: '' })
  customerNote: string;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ default: 0 })
  total: number;

  @Prop({ type: [OrderHistorySchema], default: [] })
  history: OrderHistory[];

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ default: false })
  isAbandoned: boolean;

  @Prop()
  abandonedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
