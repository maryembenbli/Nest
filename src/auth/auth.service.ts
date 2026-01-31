import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/user.service';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException();

    if (!(user._id instanceof Types.ObjectId)) {
      throw new UnauthorizedException();
    }

    const payload = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      sub: user._id.toHexString(),
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: payload,
    };
  }

  async changePassword(userId: number, newPassword: string): Promise<void> {
    await this.usersService.updatePassword(userId, newPassword);
  }
}
