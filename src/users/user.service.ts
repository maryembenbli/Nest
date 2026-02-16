import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './user.entity';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';


@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }
async createAdmin(email: string, permissions: any[]) {
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
  async listAdmins() {
  return this.userModel
    .find({}, { email: 1, isSuperAdmin: 1, permissions: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
}

async deleteAdmin(id: string) {
  return this.userModel.findByIdAndDelete(new Types.ObjectId(id)).exec();
}

async updatePermissions(id: string, permissions: string[]) {
  return this.userModel
    .findByIdAndUpdate(
      new Types.ObjectId(id),
      { permissions },
      { new: true, projection: { email: 1, isSuperAdmin: 1, permissions: 1, createdAt: 1 } },
    )
    .lean()
    .exec();
}
async createResetToken(email: string) {
  const user = await this.findByEmail(email);

  if (!user) return { ok: true };

  const token = crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  user.resetPasswordTokenHash = hash;
  user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 15); // 15 دقيقة
  await user.save();

  return { ok: true, resetToken: token };
}

async resetPassword(token: string, newPassword: string) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await this.userModel.findOne({
    resetPasswordTokenHash: hash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) throw new UnauthorizedException('Invalid/expired token');

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return { ok: true };
}


}
