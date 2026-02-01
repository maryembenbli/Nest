import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async createAdmin(
    email: string,
    permissions: string[],
  ): Promise<{ email: string; password: string }> {
    const password = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(password, 10);

    const admin = new this.userModel({
      email,
      password: hashed,
      permissions,
      isSuperAdmin: false,
    });

    await admin.save();

    return { email, password };
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashed = await bcrypt.hash(newPassword, 10);

    await this.userModel
      .findByIdAndUpdate(new Types.ObjectId(userId), { password: hashed })
      .exec();
  }
  async createSuperAdmin(email: string, password: string) {
    const exists = await this.userModel.findOne({ isSuperAdmin: true });
    if (exists) return;

    const hashed = await bcrypt.hash(password, 10);
    await this.userModel.create({
      email,
      password: hashed,
      isSuperAdmin: true,
      permissions: ['*'],
    });
  }
}
