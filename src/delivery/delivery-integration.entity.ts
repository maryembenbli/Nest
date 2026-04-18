import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeliveryIntegrationDocument = DeliveryIntegration & Document;

@Schema({ timestamps: true })
export class DeliveryIntegration {
  @Prop({ required: true, unique: true })
  providerKey: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ default: false })
  enabled: boolean;

  @Prop({ type: Object, default: {} })
  credentials: Record<string, string>;

  @Prop({ type: Object, default: {} })
  settings: Record<string, string | number | boolean>;

  @Prop()
  testedAt?: Date;

  @Prop({ type: Object, default: null })
  lastTestResult?: Record<string, unknown> | null;

  @Prop({ default: '' })
  updatedBy: string;
}

export const DeliveryIntegrationSchema =
  SchemaFactory.createForClass(DeliveryIntegration);
