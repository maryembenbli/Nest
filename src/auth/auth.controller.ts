import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { RequestWithUser } from './request-with-user.interface';
import { LoginDto } from './login.dto';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { UsersService } from '../users/user.service';
@Controller('auth')
export class AuthController {
  //constructor(private authService: AuthService) {}
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

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
  @Permissions('admins', 'create')
  createAdmin(@Body() dto: any, @Req() req: RequestWithUser) {
    return this.authService.createAdmin(dto, req.user?.email);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('set-admin-password')
  @Permissions('admins', 'update')
  setAdminPassword(@Body() body: { email: string; newPassword: string }) {
    return this.authService.setAdminPassword(body.email, body.newPassword);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('resend-admin-invite')
  @Permissions('admins', 'update')
  resendAdminInvite(
    @Body() body: { email: string },
    @Req() req: RequestWithUser,
  ) {
    return this.authService.resendAdminSetupLink(body.email, req.user?.email);
  }

  @Post('setup-admin-password')
  setupAdminPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.setupAdminPassword(body.token, body.newPassword);
  }

  //added
  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.usersService.createResetToken(email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.usersService.resetPassword(body.token, body.newPassword);
  }
}
