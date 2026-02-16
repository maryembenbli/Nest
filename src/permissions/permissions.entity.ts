import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionDocument = Permission & Document;

@Schema()
export class Permission {
  @Prop({ required: true, unique: true })
  module: string;

  @Prop({
    type: Object,
    default: {},
  })
  actions: Record<string, boolean>;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
