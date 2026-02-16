import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User &
  Document & {
    _id: Types.ObjectId;
  };

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, required: true, lowercase: true, index: true })
  email: string;
  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  isSuperAdmin: boolean;

@Prop({ type: [{ module: String, action: String }], default: [] })
permissions: { module: string; action: string }[];


  @Prop()
resetPasswordTokenHash?: string;

@Prop()
resetPasswordExpires?: Date;
}


export const UserSchema = SchemaFactory.createForClass(User);
