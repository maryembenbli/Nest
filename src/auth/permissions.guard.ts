import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithUser } from '../auth/request-with-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<{ module: string; action: string }>(
      'permissions',
      context.getHandler(),
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Super admin accès total
    if (user.isSuperAdmin) return true;

    if (!user.permissions) return false;

    const hasPermission = user.permissions.some(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (p: any) => p.module === required.module && p.action === required.action,
    );

    return hasPermission;
  }
}
