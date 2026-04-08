import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './user.entity';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';

const ADMIN_SETUP_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly mailService: MailService,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  private generateTemporaryPassword(length = 32) {
    const alphabet =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(length);

    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(
      '',
    );
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private ensureStrongPassword(password: string) {
    const normalized = password.trim();
    const hasUpper = /[A-Z]/.test(normalized);
    const hasLower = /[a-z]/.test(normalized);
    const hasDigit = /\d/.test(normalized);

    if (normalized.length < 8 || !hasUpper || !hasLower || !hasDigit) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre',
      );
    }
  }

  private buildAdminSetupUrl(token: string) {
    const adminAppUrl = process.env.ADMIN_APP_URL || 'http://127.0.0.1:8081';
    return `${adminAppUrl.replace(/\/$/, '')}/setup-password?token=${encodeURIComponent(token)}`;
  }

  private async assignNewSetupToken(userId: Types.ObjectId | string) {
    const setupToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(setupToken);
    const expiresAt = new Date(Date.now() + ADMIN_SETUP_TOKEN_TTL_MS);

    const result = await this.userModel
      .updateOne(
        { _id: userId },
        {
          $set: {
            passwordSetupRequired: true,
            passwordSetupTokenHash: tokenHash,
            passwordSetupExpires: expiresAt,
          },
        },
      )
      .exec();

    if (!result.matchedCount) {
      throw new UnauthorizedException('Admin introuvable pour generer le lien');
    }

    return {
      setupToken,
      setupUrl: this.buildAdminSetupUrl(setupToken),
      expiresAt,
    };
  }

  async createAdmin(
    email: string,
    permissions: any[],
    invitedByEmail?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.userModel.findOne({ email: normalizedEmail }).exec();
    if (existing) {
      throw new ConflictException('Un compte existe deja avec cet email');
    }

    const password = this.generateTemporaryPassword();
    const hashed = await bcrypt.hash(password, 10);

    const admin = new this.userModel({
      email: normalizedEmail,
      password: hashed,
      permissions: permissions ?? [],
      isSuperAdmin: false,
      passwordSetupRequired: true,
    });

    await admin.save();

    const invite = await this.assignNewSetupToken(admin._id);

    const emailSent = await this.mailService.sendAdminInvite({
      email: normalizedEmail,
      setupUrl: invite.setupUrl,
      expiresAt: invite.expiresAt,
      invitedByEmail,
    });

    return {
      email: normalizedEmail,
      setupUrl: invite.setupUrl,
      expiresAt: invite.expiresAt,
      passwordSetupRequired: true,
      emailSent,
    };
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashed = await bcrypt.hash(newPassword, 10);

    await this.userModel
      .findByIdAndUpdate(new Types.ObjectId(userId), {
        password: hashed,
        passwordSetupRequired: false,
        passwordSetupTokenHash: undefined,
        passwordSetupExpires: undefined,
      })
      .exec();
  }

  async createSuperAdmin(email: string, password: string) {
    const exists = await this.userModel.findOne({ isSuperAdmin: true });
    if (exists) return;

    const hashed = await bcrypt.hash(password, 10);
    await this.userModel.create({
      email: email.trim().toLowerCase(),
      password: hashed,
      isSuperAdmin: true,
      permissions: ['*'],
    });
  }

  async listAdmins() {
    return this.userModel
      .find(
        {},
        {
          email: 1,
          isSuperAdmin: 1,
          permissions: 1,
          createdAt: 1,
          passwordSetupRequired: 1,
          passwordSetupExpires: 1,
        },
      )
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async deleteAdmin(id: string) {
    return this.userModel.findByIdAndDelete(new Types.ObjectId(id)).exec();
  }

  async updatePermissions(
    id: string,
    permissions: { module: string; action: string }[],
  ) {
    return this.userModel
      .findByIdAndUpdate(
        new Types.ObjectId(id),
        { permissions },
        {
          new: true,
          projection: {
            email: 1,
            isSuperAdmin: 1,
            permissions: 1,
            createdAt: 1,
          },
        },
      )
      .lean()
      .exec();
  }

  async resendAdminSetupLink(email: string, invitedByEmail?: string) {
    const user = await this.findByEmail(email);
    if (!user || user.isSuperAdmin) {
      throw new UnauthorizedException('Admin introuvable');
    }

    const invite = await this.assignNewSetupToken(user._id);
    const emailSent = await this.mailService.sendAdminInvite({
      email: user.email,
      setupUrl: invite.setupUrl,
      expiresAt: invite.expiresAt,
      invitedByEmail,
    });

    return {
      email: user.email,
      setupUrl: invite.setupUrl,
      expiresAt: invite.expiresAt,
      passwordSetupRequired: true,
      emailSent,
    };
  }

  async setupAdminPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const user = await this.userModel.findOne({
      passwordSetupTokenHash: tokenHash,
      passwordSetupExpires: { $gt: new Date() },
      passwordSetupRequired: true,
    });

    if (!user) {
      throw new UnauthorizedException("Lien d'activation invalide ou expire");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.passwordSetupRequired = false;
    user.passwordSetupTokenHash = undefined;
    user.passwordSetupExpires = undefined;
    await user.save();

    return { ok: true, email: user.email };
  }

  async createResetToken(email: string) {
    const user = await this.findByEmail(email);

    if (!user) return { ok: true };

    const token = crypto.randomBytes(24).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    user.resetPasswordTokenHash = hash;
    user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 15);
    await user.save();

    return { ok: true, resetToken: token };
  }

  async resetPassword(token: string, newPassword: string) {
    this.ensureStrongPassword(newPassword);
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
