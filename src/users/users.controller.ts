import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { UsersService } from './user.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('admins')
  listAdmins() {
    return this.usersService.listAdmins();
  }

  @Delete('admins/:id')
  deleteAdmin(@Param('id') id: string) {
    return this.usersService.deleteAdmin(id);
  }

  @Patch('admins/:id/permissions')
  updatePerms(
    @Param('id') id: string,
    @Body('permissions') permissions: { module: string; action: string }[],
  ) {
    return this.usersService.updatePermissions(id, permissions || []);
  }
}
