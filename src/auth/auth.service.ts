import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/user.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  createAdmin(dto: LoginDto, invitedByEmail?: string) {
    return this.usersService.createAdmin(
      dto.email,
      dto.permissions ?? [],
      invitedByEmail,
    );
  }
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) throw new UnauthorizedException();

    if (user.passwordSetupRequired) {
      throw new ForbiddenException({
        code: 'PASSWORD_SETUP_REQUIRED',
        message:
          "Ce compte doit d'abord definir son mot de passe via le lien d'activation.",
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException();

    const payload = {
      sub: String(user._id),
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.permissions || [],
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: payload,
    };
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    this.ensureStrongPassword(newPassword);
    await this.usersService.updatePassword(userId, newPassword);
  }

  async setAdminPassword(email: string, newPassword: string) {
    this.ensureStrongPassword(newPassword);
    const user = await this.usersService.findByEmail(email.trim().toLowerCase());
    if (!user) throw new UnauthorizedException();
    await this.usersService.updatePassword(String(user._id), newPassword);
    return { ok: true };
  }

  async resendAdminSetupLink(email: string, invitedByEmail?: string) {
    return this.usersService.resendAdminSetupLink(email, invitedByEmail);
  }

  async setupAdminPassword(token: string, newPassword: string) {
    this.ensureStrongPassword(newPassword);
    return this.usersService.setupAdminPassword(token, newPassword);
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
}
