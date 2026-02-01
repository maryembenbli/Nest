import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { RequestWithUser } from './request-with-user.interface';
import LoginDto from './LoginDto ';
import { PermissionsGuard } from './permissions.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Req() req: RequestWithUser,
    @Body('newPassword') pwd: string,
  ) {
    return this.authService.changePassword(req.user.sub, pwd);
  }
  @Post('create-admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  createAdmin(@Body() dto: any) {
    return this.authService.createAdmin(dto);
  }
}
