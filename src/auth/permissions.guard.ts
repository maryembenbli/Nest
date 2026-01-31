import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // super admin = accès total
    if (user.isSuperAdmin) return true;

    return required.every(p => user.permissions?.includes(p));
  }
}
